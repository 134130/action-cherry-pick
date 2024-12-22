export type MergeStrategy = 'squash' | 'rebase'

export interface CherryPickOptions {
  pullNumber: number
  targetBranch: string
  // Merge strategy to use when cherry-picking. If not provided, auto-detects based on the PR's merge commit
  mergeStrategy?: MergeStrategy
  git?: {
    // git.user.name to use. If not provided, github-actions[bot] will be used
    username: string
    // git.user.email to use. If not provided, github-actions[bot]@users.noreply.github.com will be used
    email: string
  }
  // Whether to push the cherry-picked commit to the target branch. Default: false
  push?: boolean
  // GitHub token to use for API requests
  token: string
}

export type CherryPickResult = {
  branch: string
}
