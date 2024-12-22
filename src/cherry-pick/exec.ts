import { getExecOutput, ExecOptions, ExecOutput } from '@actions/exec'

export async function exec(commandLine: string, args?: string[], options?: ExecOptions): Promise<string> {
  const output = await getExecOutput(commandLine, args, { ...options, ignoreReturnCode: true })

  if (output.exitCode !== 0) {
    throw new Error(output.stderr)
  }

  return output.stdout
}

export async function execWithOutput(commandLine: string, args?: string[], options?: ExecOptions): Promise<ExecOutput> {
  return await getExecOutput(commandLine, args, { ...options, ignoreReturnCode: true })
}
