import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as io from '@actions/io'
import { afterEach, beforeEach } from '@jest/globals'
import * as git from '../../src/git'

const octokit = github.getOctokit(process.env['GH_TOKEN'] || (process.env['GITHUB_TOKEN'] as string))

process.env['GITHUB_REPOSITORY'] = '134130/test-cherry-pick'

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

describe('cherry-pick/git', () => {
  beforeEach(async () => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()

    await io.rmRF('test-cherry-pick')
    await exec.exec('git', ['clone', 'https://github.com/134130/test-cherry-pick'])
    process.chdir('test-cherry-pick')
  })

  afterEach(async () => {
    process.chdir('..')
    await io.rmRF('test-cherry-pick')
  })

  test('isDirty', async () => {
    expect(await git.isDirty()).toBe(false)

    await exec.exec('touch', ['test'])

    expect(await git.isDirty()).toBe(true)
  })

  test('getRepoRoot', async () => {
    const repoRoot = await git.getRepoRoot()
    expect(repoRoot).toContain('test-cherry-pick')
  })

  test('getPullRequest', async () => {
    const pull = await git.getPullRequest(octokit, 1)
    expect(pull.number).toBe(1)
    expect(pull.state).toBe('open')
  })

  test('inspectPullRequestMergeStrategy', async () => {
    await expect(git.inspectPullRequestMergeStrategy(octokit, 1)).rejects.toThrow('PR has not been merged yet')

    await expect(git.inspectPullRequestMergeStrategy(octokit, 4)).resolves.toBe('squash')
    await expect(git.inspectPullRequestMergeStrategy(octokit, 5)).resolves.toBe('rebase')
  })
})
