import * as core from '@actions/core'
import * as github from '@actions/github'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'
import { getMergeBase } from './git'

import { CherryPickOptions, CherryPickResult, MergeStrategy } from './types'
import * as git from './git'
import * as util from '../util'

export async function cherryPick(options: CherryPickOptions): Promise<CherryPickResult> {
  core.info(`🍒 Cherry-picking #${options.pullNumber} onto '${options.targetBranch}'`)

  const octokit = github.getOctokit(options.token)

  await util.runStep('Check if the git is dirty', async () => {
    const dirty = await git.isDirty()
    if (dirty) {
      throw new Error('Repository is dirty. Please commit or stash your changes before running this action.')
    }
  })

  await util.runStep('Check if the git is in a rebase or am', async () => {
    const isInRebaseOrAm = await git.isInRebaseOrAm()
    if (isInRebaseOrAm) {
      throw new Error('Repository is in a rebase or am. Please finish the rebase or am before running this action.')
    }
  })

  let pull!: GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.pulls.get>
  await util.runStep(`Check the PR #${options.pullNumber}`, async () => {
    pull = await git.getPullRequest(octokit, options.pullNumber)

    core.info(`    Number: ${pull.number}`)
    core.info(`     Title: ${pull.title}`)
    core.info(`    Author: ${pull.user.login} (${pull.user.email})`)

    const state: 'merged' | 'draft' | 'open' | 'closed' = pull.merged ? 'merged' : pull.draft ? 'draft' : pull.state
    core.info(`     State: ${state}`)

    if (state !== 'merged') {
      throw new Error(`PR is not merged. Please merge the PR before running this action.`)
    }
  })

  let mergeStrategy!: MergeStrategy
  await util.runStep('Determine merge strategy', async () => {
    if (options.mergeStrategy !== undefined) {
      mergeStrategy = options.mergeStrategy
      core.info(`    Use user configured merge strategy: '${mergeStrategy}'`)
      return
    }

    mergeStrategy = await git.inspectPullRequestMergeStrategy(octokit, options.pullNumber)
    core.info(`    The merge strategy is determined as '${mergeStrategy}'`)
  })

  await util.runStep('Fetch the commits between the PR and the target branch', async () => {
    const mergeBase = await getMergeBase(octokit, pull.merge_commit_sha as string, options.targetBranch)
    await git.fetch('origin', `${mergeBase}..${pull.merge_commit_sha}`)
  })

  await util.runStep('Configure git user', async () => {
    let gitUsername: string
    let gitEmail: string

    if (options.git !== undefined) {
      gitUsername = options.git.username
      gitEmail = options.git.email
      core.info(`    Use user configured git config: ${gitUsername} ${gitEmail}`)
    } else {
      gitUsername = 'github-actions[bot]'
      gitEmail = '41898282+github-actions[bot]@users.noreply.github.com'
      core.info(`    User not configured the git config. Use github-actions[bot]`)
    }

    await git.configureGitUser(gitUsername, gitEmail)
    await git.disableMergeConflictHint()
  })

  const cherryPickBranchName = `cherry-pick-pr-${options.pullNumber}-onto-${options.targetBranch.replace(/[^a-zA-Z0-9-]/g, '-')}-${Date.now()}`
  await util.runStep('Checkout branch', async () => {
    await git.fetch('origin', options.targetBranch)
    await git.checkoutNewBranch(cherryPickBranchName, `origin/${options.targetBranch}`)
  })

  switch (mergeStrategy) {
    case 'rebase':
      await util.runStep('Rebase the PR', async () => {
        const diff = await git.getPullRequestDiff(octokit, options.pullNumber, true)
        await git.applyPatch(diff)
      })
      break
    case 'squash':
      await util.runStep('Cherry-pick the PR', async () => {
        const mergeCommitSha = pull.merge_commit_sha as string
        await git.fetch('origin', mergeCommitSha)
        await git.cherryPick(mergeCommitSha)
      })
      break
  }

  if (options.push) {
    await util.runStep('Push the branch', async () => {
      await git.push('origin', cherryPickBranchName)
    })
  }

  return {
    branch: cherryPickBranchName,
    strategy: mergeStrategy
  }
}
