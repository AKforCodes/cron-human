#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { DateTime } from 'luxon';
import { explainCron, getNextRuns, validateCron } from './lib.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('cron-human')
  .description('Converts cron expressions to human-readable English and prints next run times.')
  .version(pkg.version, '-v, --version')
  .argument('<expression>', 'Cron expression to parse')
  .option('-n, --next <number>', 'how many upcoming run times to print', '5')
  .option('--tz <timezone>', 'timezone for output (default: system timezone)')
  .option('--json', 'output machine-readable JSON', false)
  .option('-q, --quiet', 'only print the one-line human explanation (no next runs)', false)
  .option('--seconds', 'support 6-field cron expressions with seconds', false)
  .action((expression, options) => {
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
      } catch(e: any) {
           console.error(`Error: Could not generate description. ${e?.message ?? e}`);
           process.exit(1);
      }

      const output: any = {
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
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();
