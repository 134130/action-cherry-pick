# Create a GitHub Action Using TypeScript

[![GitHub Super-Linter](https://github.com/134130/action-cherry-pick/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/134130/action-cherry-pick/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/134130/action-cherry-pick/actions/workflows/check-dist.yml/badge.svg)](https://github.com/134130/action-cherry-pick/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/134130/action-cherry-pick/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/134130/action-cherry-pick/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

## Usage

```yaml
steps:
  - name: Checkout
    id: checkout
    uses: actions/checkout@v4

  - name: Test Local Action
    id: test-action
    uses: 134130/action-cherry-pick@v1
    with:
      pr: 100
      onto: release-1.0
```
