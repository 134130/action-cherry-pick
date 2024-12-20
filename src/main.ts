import * as core from '@actions/core'
import * as github from '@actions/github'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'

import * as git from './git'
import { exit } from 'process'

export async function run(): Promise<void> {
  const pr: number = Number.parseInt(core.getInput('pr', { required: true }))
  const onto: string = core.getInput('onto', { required: true })
  const token: string = core.getInput('token', { required: true })

  core.info(`🍒 Cherry-picking PR #${pr} onto ${onto}`)

  const octokit = github.getOctokit(token)

  await core.group('🍒 Checking if the repository is dirty ...', async () => {
    try {
      const dirty = await git.isDirty()
      if (dirty) {
        core.setFailed('Repository is dirty. Please commit or stash your changes before running this action.')
        exit(1)
      }
      core.info('Repository is not dirty')
    } catch (error) {
      core.setFailed(`Failed to check if the repository is dirty: ${(error as Error).message})`)
      exit(1)
    }
  })

  await core.group('🍒 Checking if the repository is in a rebase or am ...', async () => {
    try {
      const inRebaseOrAm = await git.isInRebaseOrAm()
      if (inRebaseOrAm) {
        core.setFailed('Repository is in a rebase or am. Please finish the rebase or am before running this action.')
        exit(1)
      }
      core.info('Repository is not in a rebase or am')
    } catch (error) {
      core.setFailed(`Failed to check if the repository is in a rebase or am: ${(error as Error).message})`)
      exit(1)
    }
  })

  let pull!: GetResponseDataTypeFromEndpointMethod<typeof octokit.rest.pulls.get>
  await core.group(`🍒 Fetching the PR #${pr} ...`, async () => {
    try {
      core.info(`owner: ${github.context.repo.owner}`)
      core.info(`repo: ${github.context.repo.repo}`)
      pull = await git.getPullRequest(octokit, pr)
    } catch (error) {
      core.setFailed(`Failed to fetch the PR branch: ${(error as Error).message})`)
      exit(1)
    }

    core.info(`Fetched PR ${pull.title} (#${pr}) by ${pull.user.login} (branch=${pull.head.ref})`)
  })

  if (pull.merged !== true) {
    const currentState = pull.draft ? 'draft' : pull.state
    core.setFailed(`PR #${pr} is not merged (current: ${currentState}). Please merge the PR before running this action.`)
    exit(1)
  }

  await core.group('🍒 Fetching the target branch ...', async () => {
    try {
      await git.fetch('origin', onto)
    } catch (error) {
      core.setFailed(`Failed to fetch the target branch: ${(error as Error).message})`)
      exit(1)
    }
  })

  const cherryPickBranchName = `cherry-pick-pr-${pr}-onto-${onto}-${Date.now()}`

  core.info(`🍒 The branch name is ${cherryPickBranchName}`)

  await core.group('🍒 Checking out branch ...', async () => {
    try {
      await git.checkoutNewBranch(cherryPickBranchName, onto)
    } catch (error) {
      core.setFailed(`Failed to checkout the branch: ${(error as Error).message})`)
      exit(1)
    }
  })

  let mergeStrategy!: 'rebase' | 'squash'
  await core.group('🍒 Determining the merge strategy ...', async () => {
    try {
      mergeStrategy = await git.inspectPullRequestMergeStrategy(octokit, pr)
      core.info(`The merge strategy of the PR #${pr} is inspected as ${mergeStrategy}`)
    } catch (error) {
      core.setFailed(`Failed to determine the merge strategy: ${(error as Error).message})`)
      exit(1)
    }
  })

  core.info(`🍒 The merge strategy is determined as ${mergeStrategy}`)

  switch (mergeStrategy) {
    case 'rebase':
      await core.group('🍒 Rebasing the PR ...', async () => {
        try {
          core.info('Fetching the PR diff ...')
          const diff = await git.getPullRequestDiff(octokit, pr, true)
          core.info('PR diff fetched')

          core.info('Applying the PR diff ...')
          await git.applyPatch(diff)
          core.info('PR diff applied')
        } catch (error) {
          core.setFailed(`Failed to rebase the PR: ${(error as Error).message})`)
        }
      })
      break
    case 'squash':
      await core.group('🍒 Cherry-picking the PR ...', async () => {
        try {
          await git.cherryPick(pull.merge_commit_sha!!)
        } catch (error) {
          core.setFailed(`Failed to cherry-pick the PR: ${(error as Error).message})`)
        }
      })
      break
  }

  await core.group('🍒 Pushing the branch ...', async () => {
    try {
      await git.push('origin', cherryPickBranchName)
    } catch (error) {
      core.setFailed(`Failed to push the branch: ${(error as Error).message})`)
      exit(1)
    }
  })

  core.info(`🍒 Cherry-picked PR #${pr} onto ${onto}`)
}
