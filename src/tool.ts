import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'

import os from 'os'

export async function getTool(
  toolName: string,
  version: string
): Promise<string> {
  const osPlat: string = os.platform()
  const osArch: string = os.arch()

  // check cache
  const toolPath = tc.find(toolName, version)
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`)
    return toolPath
  }

  core.info(`Attempting to download ${toolName} ${version}`)

  const downloadUrl: string = `https://github.com/134130/gh-cherry-pick/releases/download/${version}/${toolName}-${version}-${osPlat}-${osArch}.tar.gz`
  core.info(`Acquiring ${toolName} ${version} from ${downloadUrl}`)
  const downloadPath = await tc.downloadTool(downloadUrl)

  core.info(`Extracting ${toolName} ...`)
  let extPath: string
  if (osPlat === 'win32') {
    extPath = await tc.extractZip(downloadPath)
  } else {
    extPath = await tc.extractTar(downloadPath)
  }
  core.info(`Successfully extracted ${toolName} to ${extPath}`)

  core.info('Adding to the cache ...')
  const cachedDir = await tc.cacheDir(extPath, toolName, version)
  core.info(`Successfully cached ${toolName} to ${cachedDir}`)

  return cachedDir
}