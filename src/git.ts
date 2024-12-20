import * as fs from 'fs'

import * as core from '@actions/core'
import * as github from '@actions/github'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'

import { exec } from './exec'
import { buffer } from 'stream/consumers'

type Octokit = ReturnType<typeof github.getOctokit>

export async function isDirty(): Promise<boolean> {
  const output = await exec('git', ['status', '--porcelain'])
  return output.trim().length > 0
}

export async function isInRebaseOrAm(): Promise<boolean> {
  const repoRoot = await getRepoRoot()

  const rebaseMagicFile = `${repoRoot}/.git/rebase-apply`
  return fs.existsSync(rebaseMagicFile)
}

export async function getRepoRoot(): Promise<string> {
  const output = await exec('git', ['rev-parse', '--show-toplevel'])
  return output.trim()
}

export async function getPullRequest(
  octokit: Octokit,
  number: number
): Promise<GetResponseDataTypeFromEndpointMethod<Octokit['rest']['pulls']['get']>> {
  const { data } = await octokit.rest.pulls.get({
    ...github.context.repo,
    pull_number: number
  })
  return data
}

export async function fetch(remote: string, refspec: string): Promise<void> {
  await exec('git', ['fetch', '--recurse-submodules', remote, refspec])
}

export async function checkoutNewBranch(newBranch: string, startPoint: string): Promise<void> {
  await exec('git', ['checkout', newBranch, startPoint])
}

export async function inspectPullRequestMergeStrategy(octokit: Octokit, prNumber: number): Promise<'squash' | 'rebase'> {
  const pull = await getPullRequest(octokit, prNumber)

  const mergeCommitSha = pull.merge_commit_sha
  if (mergeCommitSha === null) {
    throw new Error('PR has not been merged yet')
  }

  const prevCommitRef = `${mergeCommitSha}~1`
  const { data: prevCommitAssociatedPRs } = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls', {
    ...github.context.repo,
    commit_sha: prevCommitRef,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  for (const pr of prevCommitAssociatedPRs) {
    if (pr.number === prNumber) {
      return 'rebase'
    }
  }

  return 'squash'
}

export async function getPullRequestDiff(octokit: Octokit, prNumber: number, asPatch: boolean): Promise<string> {
  const { data: diff } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    ...github.context.repo,
    pull_number: prNumber,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
      accept: asPatch ? 'application/vnd.github.v3.patch' : 'application/vnd.github.v3.diff'
    }
  })

  return diff as unknown as string
}

export async function applyPatch(patch: string): Promise<void> {
  await exec('git', ['am', '-3'], { input: Buffer.from(patch, 'utf8') })
}

export async function cherryPick(commit: string): Promise<void> {
  await exec('git', ['cherry-pick', commit])
}

export async function push(upstream: string, ref: string): Promise<void> {
  await exec('git', ['push', '--set-upstream', upstream, ref])
}
