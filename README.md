# Cherry Pick your Pull Request to Target branch automatically

The action will cherry-pick the pull request to the target branch automatically.

## Usage

```yaml
on:
  pull_request:
    types: [closed]
  workflow_dispatch:
    inputs:
      pr:
        description: 'Pull Request number'
        required: true
      target:
        description: 'Target branch'
        required: true

steps:
  - uses: actions/checkout@v4

  - uses: .github/actions/cherry-pick@develop
    with:
      pr: ${{ github.event.pull_request.number }}
      target: release/10.2.2
```
