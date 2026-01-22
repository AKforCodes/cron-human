class CliError extends Error{
  constructor(msg: string){
    super(msg)
  }
}

function handleErr(err: unknown): CliError{
  if(err instanceof Error){
    return new CliError(err.message)
  }
  else if(typeof err === "string"){
    return new CliError(err);
  }else{
    return new CliError("unknown error")
  }
}

export {
  CliError,
  handleErr
}
