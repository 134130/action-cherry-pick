/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'

let getInputMock: jest.SpiedFunction<typeof core.getInput>

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation(name => {
      switch (name) {
        case 'pr':
          return '1'
        case 'onto':
          return 'main'
        case 'token':
          return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
        default:
          return ''
      }
    })
  })

  it('my test', async () => {
    main.run()
  })
})
