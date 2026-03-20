#!/usr/bin/env node
import { Command } from 'commander';
import { DateTime } from 'luxon';
import { explainCron, getNextRuns, validateCron, compareCron, cronStats } from './lib.js';
import { handleErr } from "./utils/error.js"
import pkg from "../package.json" with {type: "json"}

const program = new Command();
program.enablePositionalOptions();

program
  .name('cron-human')
  .description('Converts cron expressions to human-readable English and prints next run times.')
  .version(pkg.version, '-v, --version')
  .argument('[expression]', 'Cron expression to parse')
  .option('-n, --next <number>', 'how many upcoming run times to print', '5')
  .option('--tz <timezone>', 'timezone for output (default: system timezone)')
  .option('--json', 'output machine-readable JSON', false)
  .option('-q, --quiet', 'only print the one-line human explanation (no next runs)', false)
  .option('--seconds', 'support 6-field cron expressions with seconds', false)
  .option('-i, --interactive', 'launch interactive TUI mode')
  .action(async (expression, options) => {
    if (options.interactive) {
        const { startTui } = await import('./ui/launcher.js');
        await startTui();
        return;
    }

    if (!expression) {
        program.help();
        return;
    }

    if (options.tz) {
      const test = DateTime.now().setZone(options.tz);
      if (!test.isValid) {
        console.error(`Error: invalid timezone "${options.tz}" (use IANA like "Europe/London")`);
        process.exit(1);
      }
    }

    let nextCount = 5;
    if (options.next) {
      const count = parseInt(options.next, 10);
      if (!Number.isFinite(count) || count < 1 || count > 100) {
        console.error("Error: --next must be a number between 1 and 100");
        process.exit(1);
      }
      nextCount = count;
    }

    const error = validateCron(expression, {
      timezone: options.tz,
      allowSeconds: options.seconds
    });

    if (error) {
      console.error(error);
      process.exit(1);
    }

    try {
      let description = '';
      try {
        description = explainCron(expression);
      } catch (e: unknown) {
        const err = handleErr(e)
        console.error(`Error: Could not generate description. ${err.message}`);
        process.exit(1);
      }

      interface Output {
        expression: string;
        description: string;
        nextRuns?: string[];
      }

      const output: Output = {
        expression,
        description,
      };

      if (!options.quiet) {
        output.nextRuns = getNextRuns(expression, nextCount, options.tz);
      }

      if (options.json) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log(description);
        if (output.nextRuns && output.nextRuns.length > 0) {
          console.log(`\nNext ${output.nextRuns.length} runs:`);
          output.nextRuns.forEach((run: string) => console.log(`- ${run}`));
        }
      }
    } catch (e: unknown) {
      const err = handleErr(e);
      console.error(err)
      process.exit(1);
    }
  });

program.command('stats')
    .description('Show frequency statistics, gap analysis, and optional cost estimate')
    .argument('<expression>', 'Cron expression to analyze')
    .option('--tz <timezone>', 'timezone for calculation')
    .option('--json', 'output machine-readable JSON', false)
    .option('--seconds', 'support 6-field cron expressions with seconds', false)
    .option('--cost <price>', 'cost per invocation (e.g., 0.002 for AWS Lambda)')
    .action((expression: string, options: { tz?: string; json: boolean; seconds: boolean; cost?: string }) => {
        let costPerRun: number | undefined;
        if (options.cost !== undefined) {
            costPerRun = parseFloat(options.cost);
            if (!Number.isFinite(costPerRun) || costPerRun < 0) {
                console.error("Error: --cost must be a non-negative number");
                process.exit(1);
            }
        }

        try {
            const result = cronStats(expression, {
                timezone: options.tz,
                allowSeconds: options.seconds,
                costPerRun,
            });

            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`Schedule: ${result.description}`);
                console.log();
                console.log('Frequency:');
                console.log(`  Per day ......... ${result.frequency.perDay}`);
                console.log(`  Per week ........ ${result.frequency.perWeek}`);
                console.log(`  Per month ....... ${result.frequency.perMonth}`);
                console.log(`  Per year ........ ${result.frequency.perYear}`);
                console.log();
                console.log('Gaps:');
                console.log(`  Shortest ........ ${result.gaps.shortest.label}  (${result.gaps.shortest.minutes} min)`);
                console.log(`  Longest ......... ${result.gaps.longest.label}  (${result.gaps.longest.minutes} min)`);
                console.log(`  Average ......... ${result.gaps.average.label}  (${result.gaps.average.minutes} min)`);

                if (result.cost) {
                    console.log();
                    console.log(`Cost estimate ($${costPerRun}/invocation):`);
                    console.log(`  Monthly ......... $${result.cost.monthly.toFixed(2)}`);
                    console.log(`  Yearly .......... $${result.cost.yearly.toFixed(2)}`);
                }
            }
        } catch (e: unknown) {
            const err = handleErr(e);
            console.error(err.message);
            process.exit(1);
        }
    });

program.command('diff')
    .description('Compare two cron expressions side-by-side')
    .argument('<expressionA>', 'First cron expression')
    .argument('<expressionB>', 'Second cron expression')
    .option('-n, --next <number>', 'how many upcoming run times to print', '5')
    .option('--tz <timezone>', 'timezone for output')
    .option('--json', 'output machine-readable JSON', false)
    .option('--seconds', 'support 6-field cron expressions with seconds', false)
    .action((exprA: string, exprB: string, options: { next: string; tz?: string; json: boolean; seconds: boolean }) => {
        const count = parseInt(options.next, 10);
        if (!Number.isFinite(count) || count < 1 || count > 100) {
            console.error("Error: --next must be a number between 1 and 100");
            process.exit(1);
        }

        try {
            const result = compareCron(exprA, exprB, count, {
                timezone: options.tz,
                allowSeconds: options.seconds,
            });

            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`A: ${result.a.description}`);
                console.log(`   ${result.a.expression}`);
                console.log();
                console.log(`B: ${result.b.description}`);
                console.log(`   ${result.b.expression}`);
                console.log();

                const max = Math.max(result.a.nextRuns.length, result.b.nextRuns.length);
                if (max > 0) {
                    console.log(`Next ${max} runs:`);
                    console.log(`${'A'.padEnd(24)}B`);
                    console.log(`${'─'.repeat(23)} ${'─'.repeat(23)}`);
                    for (let i = 0; i < max; i++) {
                        const a = result.a.nextRuns[i] ?? '';
                        const b = result.b.nextRuns[i] ?? '';
                        console.log(`${a.padEnd(24)}${b}`);
                    }
                }
            }
        } catch (e: unknown) {
            const err = handleErr(e);
            console.error(err.message);
            process.exit(1);
        }
    });

// Add explicit command as well
program.command('tui')
    .description('Launch the interactive TUI')
    .action(async () => {
        const { startTui } = await import('./ui/launcher.js');
        await startTui();
    });

program.parse();
