import { getExecOutput, ExecOptions } from '@actions/exec'

export async function exec(commandLine: string, args?: string[], options?: ExecOptions): Promise<string> {
  const output = await getExecOutput(commandLine, args, options)

  if (output.exitCode !== 0) {
    throw new Error(`Failed to run ${commandLine}: ${output.stderr}`)
  }

  return output.stdout
}
