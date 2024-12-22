import * as core from '@actions/core'
import * as github from '@actions/github'

import { cherryPick } from './cherry-pick'
import { CherryPickOptions } from './cherry-pick/types'
import * as util from './util'

export async function run(): Promise<void> {
  const pr: number = Number.parseInt(core.getInput('pr', { required: true, trimWhitespace: true }))
  const onto: string = core.getInput('onto', { required: true, trimWhitespace: true })
  const token: string = core.getInput('token', { required: true, trimWhitespace: true })

  const gitUserName: string = core.getInput('git_user_name', { required: false, trimWhitespace: true })
  const gitUserEmail: string = core.getInput('git_user_email', { required: false, trimWhitespace: true })

  const pullRequestTemplate: string = core.getInput('pull_request_template', { required: false })

  const cherryPickOptions: CherryPickOptions = {
    pullNumber: pr,
    targetBranch: onto,
    token: token,
    push: true
  }

  if (gitUserName && gitUserEmail) {
    cherryPickOptions.git = {
      username: gitUserName,
      email: gitUserEmail
    }
  }

  const { branch } = await cherryPick(cherryPickOptions)

  if (pullRequestTemplate) {
    await util.runStep('Create pull request', async () => {
      const octokit = github.getOctokit(token)

      const index = pullRequestTemplate.indexOf('\n')
      const title = pullRequestTemplate.substring(0, index)
      const body = pullRequestTemplate.substring(index + 1)

      const { data: pull } = await octokit.rest.pulls.create({
        ...github.context.repo,
        head: branch,
        base: onto,
        title: title,
        body: body
      })

      await octokit.rest.issues.addLabels({
        ...github.context.repo,
        issue_number: pull.number,
        labels: ['cherry-pick']
      })

      await octokit.rest.issues.addAssignees({
        ...github.context.repo,
        issue_number: pull.number,
        assignees: [github.context.actor]
      })

      core.setOutput('pr', pull.number.toString())
    })
  }

  core.setOutput('branch', branch)
}
