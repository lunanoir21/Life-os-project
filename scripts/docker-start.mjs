#!/usr/bin/env node
/**
 * Cross-platform single-command launcher for Life OS via Docker.
 *
 * - Works on Linux, macOS, Windows (PowerShell / CMD) and WSL.
 * - Verifies that the Docker engine is installed and reachable.
 * - Detects whether to use the modern `docker compose` plugin or the
 *   legacy `docker-compose` binary.
 * - Builds (if needed) and starts the stack in the background.
 * - Polls the container health endpoint, then streams logs until Ctrl+C.
 *
 * Usage:  bun run docker:start     (or  node scripts/docker-start.mjs)
 */

import { spawn, spawnSync } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'

// ─── tiny ANSI helpers (no extra deps) ────────────────────────────────
const ESC = '\x1b['
const c = {
  reset: `${ESC}0m`,
  dim: `${ESC}2m`,
  bold: `${ESC}1m`,
  red: `${ESC}31m`,
  green: `${ESC}32m`,
  yellow: `${ESC}33m`,
  blue: `${ESC}34m`,
  cyan: `${ESC}36m`,
}
const supportsColor = process.stdout.isTTY && process.env.NO_COLOR === undefined
const paint = (col, msg) => (supportsColor ? `${col}${msg}${c.reset}` : msg)

const log = {
  info: (m) => console.log(`${paint(c.cyan, '▸')} ${m}`),
  ok: (m) => console.log(`${paint(c.green, '✓')} ${m}`),
  warn: (m) => console.log(`${paint(c.yellow, '!')} ${m}`),
  err: (m) => console.error(`${paint(c.red, '✗')} ${m}`),
  step: (m) => console.log(`\n${paint(c.bold + c.blue, '◆')} ${paint(c.bold, m)}`),
  dim: (m) => console.log(paint(c.dim, m)),
}

// ─── helpers ──────────────────────────────────────────────────────────
function runSync(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', shell: false, ...opts })
}

function runInherit(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts })
}

function detectCompose() {
  // Prefer the modern plugin: `docker compose`
  const plugin = runSync('docker', ['compose', 'version'])
  if (plugin.status === 0) return { cmd: 'docker', baseArgs: ['compose'] }

  // Fall back to the legacy binary
  const legacy = runSync('docker-compose', ['version'])
  if (legacy.status === 0) return { cmd: 'docker-compose', baseArgs: [] }

  return null
}

function dockerAvailable() {
  const v = runSync('docker', ['--version'])
  if (v.status !== 0) return { ok: false, reason: 'not-installed' }
  const info = runSync('docker', ['info'])
  if (info.status !== 0) return { ok: false, reason: 'daemon-down', stderr: info.stderr }
  return { ok: true }
}

async function waitHealthy(compose, serviceName, timeoutMs = 180_000) {
  const start = Date.now()
  const url = 'http://localhost:3000/'
  let attempt = 0
  while (Date.now() - start < timeoutMs) {
    attempt += 1
    // Two parallel signals: container running + frontend reachable
    const ps = runSync(compose.cmd, [...compose.baseArgs, 'ps', '--format', 'json'])
    if (ps.status === 0 && ps.stdout.includes(serviceName)) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
        if (res.ok || res.status === 404) return true
      } catch {
        /* not ready yet */
      }
    }
    if (attempt % 5 === 0) log.dim(`  …still waiting (${Math.round((Date.now() - start) / 1000)}s)`)
    await wait(2000)
  }
  return false
}

function platformLine() {
  const { platform, arch } = process
  const map = { linux: 'Linux', darwin: 'macOS', win32: 'Windows' }
  return `${map[platform] ?? platform} / ${arch}`
}

// ─── main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(paint(c.bold, '\n  Life OS · Docker launcher'))
  log.dim(`  Platform: ${platformLine()}\n`)

  log.step('Checking Docker')
  const dk = dockerAvailable()
  if (!dk.ok) {
    if (dk.reason === 'not-installed') {
      log.err('Docker is not installed or not on PATH.')
      log.dim('  Install Docker Desktop: https://www.docker.com/products/docker-desktop')
    } else {
      log.err('Docker is installed but the daemon is not running.')
      log.dim('  Start Docker Desktop (or `sudo systemctl start docker` on Linux) and retry.')
      if (dk.stderr) log.dim(`  ${dk.stderr.trim().split('\n')[0]}`)
    }
    process.exit(1)
  }
  log.ok('Docker engine reachable')

  const compose = detectCompose()
  if (!compose) {
    log.err('Neither `docker compose` plugin nor `docker-compose` is available.')
    log.dim('  Upgrade Docker Desktop, or install the compose plugin.')
    process.exit(1)
  }
  log.ok(`Compose: ${compose.cmd} ${compose.baseArgs.join(' ')}`.trim())

  log.step('Building and starting the stack')
  log.dim('  (first build can take several minutes — Rust + Next.js)')
  const up = runInherit(compose.cmd, [...compose.baseArgs, 'up', '-d', '--build'])
  if (up.status !== 0) {
    log.err('Compose failed to bring the stack up. See the output above.')
    process.exit(up.status ?? 1)
  }
  log.ok('Stack started in the background')

  log.step('Waiting for Life OS to become reachable')
  const healthy = await waitHealthy(compose, 'life-os')
  if (!healthy) {
    log.warn('Stack started, but the health probe never succeeded.')
    log.dim('  Check container logs:  docker compose logs -f')
  } else {
    log.ok('Life OS is ready')
  }

  console.log('')
  console.log(`  ${paint(c.bold + c.green, '→')}  Open ${paint(c.bold, 'http://localhost:3000')}`)
  console.log(`  ${paint(c.dim, 'Stop:')}  bun run docker:stop`)
  console.log(`  ${paint(c.dim, 'Reset:')} bun run docker:reset   ${paint(c.dim, '(deletes the data volume)')}`)
  console.log('')

  log.step('Tailing logs (Ctrl+C to detach — the stack keeps running)')
  // Stream logs in the foreground; Ctrl+C only stops the follower.
  const follower = spawn(compose.cmd, [...compose.baseArgs, 'logs', '-f', '--tail=50'], {
    stdio: 'inherit',
    shell: false,
  })
  const onSig = () => {
    follower.kill('SIGINT')
  }
  process.on('SIGINT', onSig)
  process.on('SIGTERM', onSig)
  follower.on('exit', (code) => {
    console.log('')
    log.dim('  Detached from log stream. Container is still running.')
    process.exit(code ?? 0)
  })
}

main().catch((err) => {
  log.err(err?.message ?? String(err))
  process.exit(1)
})
