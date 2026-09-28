import { execFileSync, execSync } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import EmbeddedPostgres from 'embedded-postgres'

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No TCP port')
  const port = address.port
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return port
}

/**
 * Runs an npm/npx command. On Windows these are .cmd shims that need a shell;
 * the arguments are fixed literals from the tests, so joining them is safe.
 */
export function runNodeTool(tool: 'npm' | 'npx', args: string[], env: NodeJS.ProcessEnv) {
  const options = { cwd: process.cwd(), env: { ...process.env, ...env }, stdio: 'pipe' as const }
  if (process.platform === 'win32') {
    execSync([`${tool}.cmd`, ...args].join(' '), options)
  } else {
    execFileSync(tool, args, options)
  }
}

/** Starts a throwaway PostgreSQL with all migrations applied. */
export async function startTestDatabase() {
  const port = await freePort()
  const postgres = new EmbeddedPostgres({
    databaseDir: await mkdtemp(join(tmpdir(), 'ecorota-integration-')),
    port,
    user: 'ecorota',
    password: 'ecorota',
    persistent: false,
    onLog: () => {},
  })
  await postgres.initialise()
  await postgres.start()
  await postgres.createDatabase('ecorota')
  const databaseUrl = `postgresql://ecorota:ecorota@127.0.0.1:${port}/ecorota`
  runNodeTool('npx', ['prisma', 'migrate', 'deploy'], { DATABASE_URL: databaseUrl })
  return { databaseUrl, stop: () => postgres.stop() }
}
