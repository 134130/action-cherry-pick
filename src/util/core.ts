import * as core from '@actions/core'
import * as process from 'node:process'

export async function runStep(name: string, fn: () => Promise<void>): Promise<void> {
  await core.group(`🍒 ${name} ...`, async () => {
    await fn().catch(error => {
      core.setFailed((error as Error).message)
      process.exit(1)
    })
  })
}
