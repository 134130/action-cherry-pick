import * as core from '@actions/core'
import * as process from 'node:process'

export async function runStep(name: string, fn: () => Promise<void>): Promise<void> {
  await core.group(`🍒 ${name} ...`, async () => {
    await fn().catch(error => {
      if (error instanceof Error) {
        core.setFailed(error.message)
      } else {
        core.setFailed(String(error))
      }
      process.exit(1)
    })
  })
}
