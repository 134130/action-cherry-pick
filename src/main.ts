import * as core from '@actions/core'
import * as io from '@actions/io'

import * as tool from './tool'
import * as exec from '@actions/exec'

export async function run(): Promise<void> {
  try {
    const pr: number = Number.parseInt(core.getInput('pr', { required: true }))
    const onto: string = core.getInput('onto', { required: true })

    core.info(`PR: ${pr}`)
    core.info(`Onto: ${onto}`)

    const ghCherryPick = await tool.getTool('gh-cherry-pick', '2.0.0')
    core.addPath(ghCherryPick)

    core.info(`which gh-cherry-pick: ${await io.which('gh-cherry-pick', true)}`)

    await exec.exec(`gh-cherry-pick -pr ${pr} -onto ${onto}`)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
