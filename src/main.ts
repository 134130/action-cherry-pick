import * as core from '@actions/core'

import cp from 'child_process'

import * as tool from './tool'
import path from 'path'

export async function run(): Promise<void> {
  try {
    const pr: number = Number.parseInt(core.getInput('pr', { required: true }))
    const onto: string = core.getInput('onto', { required: true })

    core.info(`PR: ${pr}`)
    core.info(`Onto: ${onto}`)

    const ghCherryPickPath = await tool.getTool('gh-cherry-pick', '2.0.0')
    const ghCherryPick = path.join(ghCherryPickPath, 'gh-cherry-pick')

    cp.execSync(`${ghCherryPick} -pr ${pr} -onto ${onto}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
