import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as io from '@actions/io'
import { afterEach, beforeEach } from '@jest/globals'
import { cherryPick } from '../../src/cherry-pick'

const token = process.env['GH_TOKEN'] || (process.env['GITHUB_TOKEN'] as string)

process.env['GITHUB_REPOSITORY'] = '134130/test-cherry-pick'

// Mock the GitHub Actions core library
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

let processExitMock: jest.SpiedFunction<typeof process.exit>

describe('cherry-pick', () => {
  beforeEach(async () => {
    jest.clearAllMocks()

    debugMock = jest.spyOn(core, 'debug').mockImplementation()
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()

    processExitMock = jest.spyOn(process, 'exit').mockImplementation()

    await io.rmRF('test-cherry-pick')
    await exec.exec('git', ['clone', 'https://github.com/134130/test-cherry-pick'])
    process.chdir('test-cherry-pick')
  })

  afterEach(async () => {
    process.chdir('..')
    await io.rmRF('test-cherry-pick')
  })

  test('cherryPick squash merged PR should be success', async () => {
    await expect(
      cherryPick({
        pullNumber: 4,
        targetBranch: 'release/10.0',
        token: token
      })
    ).resolves.not.toThrow()

    expect(setFailedMock).not.toHaveBeenCalled()
    expect(processExitMock).not.toHaveBeenCalled()
  })

  test('cherryPick rebase merged PR should be success', async () => {
    await expect(
      cherryPick({
        pullNumber: 5,
        targetBranch: 'release/10.0',
        token: token
      })
    ).resolves.not.toThrow()

    expect(setFailedMock).not.toHaveBeenCalled()
    expect(processExitMock).not.toHaveBeenCalled()
  })

  test('cherryPick that will make conflict PR should be failure', async () => {
    await expect(
      cherryPick({
        pullNumber: 7,
        targetBranch: 'release/10.0',
        token: token
      })
    ).resolves.not.toThrow()

    expect(setFailedMock).toHaveBeenCalled()
    expect(processExitMock).toHaveBeenCalledWith(1)
  })
})
