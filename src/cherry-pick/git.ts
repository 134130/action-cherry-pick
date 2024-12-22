import * as fs from 'fs'

import * as github from '@actions/github'
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types'

import { exec, execWithOutput } from './exec'

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
  await exec('git', ['checkout', '--recurse-submodules', '-b', newBranch, startPoint])
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

export async function getMergeBase(octokit: Octokit, commitA: string, commitB: string): Promise<string> {
  const { data: data } = await octokit.request('GET /repos/{owner}/{repo}/compare/{basehead}', {
    ...github.context.repo,
    basehead: `${commitA}^..${commitB}`,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  return data.merge_base_commit.sha
}

export async function disableMergeConflictHint(): Promise<void> {
  await exec('git', ['config', 'advice.mergeConflict', 'false'])
}

export async function applyPatch(patch: string): Promise<void> {
  const result = await execWithOutput('git', ['apply', '-3'], { input: Buffer.from(patch, 'utf8') })

  if (result.exitCode === 0) {
    return
  }

  if (result.exitCode === 1 && /^CONFLICT/m.test(result.stdout)) {
    throw new Error('Failed to apply patch due to merge conflict')
  }

  throw new Error(`Failed to apply patch: ${result.stdout}`)
}

export async function cherryPick(commit: string): Promise<void> {
  const result = await execWithOutput('git', ['cherry-pick', '--keep-redundant-commits', commit])

  if (result.exitCode === 0) {
    return
  }

  if (result.exitCode === 1 && /^CONFLICT/m.test(result.stdout)) {
    throw new Error('Failed to cherry-pick due to merge conflict')
  }

  throw new Error(`Failed to cherry-pick: ${result.stdout}`)
}

export async function push(upstream: string, ref: string): Promise<void> {
  await exec('git', ['push', '--set-upstream', upstream, ref])
}

export async function configureGitUser(name: string, email: string): Promise<void> {
  await exec('git', ['config', 'user.name', name])
  await exec('git', ['config', 'user.email', email])
}
