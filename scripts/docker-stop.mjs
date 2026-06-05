#!/usr/bin/env node
/**
 * Cross-platform stop helper for the Life OS Docker stack.
 *
 * Mirrors docker-start.mjs: detects whether to call `docker compose`
 * or the legacy `docker-compose` binary and runs `down`.
 *
 * Usage:
 *   bun run docker:stop          # stop containers, keep the data volume
 *   bun run docker:stop --reset  # also remove the named volume (DATA LOSS)
 */

import { spawnSync } from 'node:child_process'

function detectCompose() {
  if (spawnSync('docker', ['compose', 'version']).status === 0) {
    return { cmd: 'docker', baseArgs: ['compose'] }
  }
  if (spawnSync('docker-compose', ['version']).status === 0) {
    return { cmd: 'docker-compose', baseArgs: [] }
  }
  return null
}

const compose = detectCompose()
if (!compose) {
  console.error('✗ Docker Compose is not available on this machine.')
  process.exit(1)
}

const reset = process.argv.slice(2).includes('--reset')
const args = [...compose.baseArgs, 'down']
if (reset) args.push('--volumes')

console.log(`▸ ${compose.cmd} ${args.join(' ')}`)
const res = spawnSync(compose.cmd, args, { stdio: 'inherit', shell: false })
process.exit(res.status ?? 0)
