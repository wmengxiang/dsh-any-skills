/**
 * dsh-any-skills — host half.
 *
 * Registers a same-origin JSON API on the DSH webServer:
 *
 *   GET    /api/skills/list        -> installed skills under installDir
 *   GET    /api/skills/sources?cwd -> importable skills from Codex / Claude Code / OpenCode
 *   POST   /api/skills/import      -> { type, path?, repository?, cwd?, names? }
 *   POST   /api/skills/install     -> { sources: [{ type: 'github'|'npm', value }] }  (batch)
 *   DELETE /api/skills/uninstall   -> { name }  (moves the skill into .trash-*)
 *
 * Skills land in the configured installDir (default ~/.dsh/skills — the
 * `user-dsh` root of the native skill provider, watched automatically), so
 * imported skills become visible to the model and to the native
 * `/skill-name` invocation without extra registration.
 *
 * All filesystem work happens here; the browser half only fetches JSON.
 */
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import {
  defaultInstallDir,
  detectSources,
  installAllFromRoot,
  installBundleDir,
  installFlatFile,
  listInstalled,
  normalizeSkillName,
  pathExists,
  resolveSourceGroup,
  restoreSkill,
  scanDirectory,
  uninstallSkill,
} from './src/skills.js'
import { installFromGitHub, installFromNpm, parseRepoInput } from './src/remote.js'

export const name = 'dsh-any-skills'
export const inject = ['webServer']

// Re-export the core logic for other host plugins and for tests.
export { parseSkillText, installAllFromRoot, detectSources, uninstallSkill, restoreSkill, normalizeSkillName, scanDirectory } from './src/skills.js'
export { parseRepoInput, parseNpmSpec, installFromGitHub, installFromNpm, installSkillsFromTree, downloadTarball, DOWNLOAD_TIMEOUT_MS, DOWNLOAD_RETRIES, gitCloneSparse, SPARSE_EXCLUSIONS } from './src/remote.js'

export interface Config {
  /** Directory where imported/installed skills land. Defaults to ~/.dsh/skills. */
  installDir?: string
  /** Optional GitHub token to lift API rate limits (used for repo inspection). */
  githubToken?: string
  /** Optional path to a file containing a GitHub token. */
  githubTokenFile?: string
}

/** Minimal structural host context (type-only; runtime services come from DSH). */
interface HostContext {
  webServer?: {
    register(route: {
      kind: 'exact' | 'prefix'
      path: string
      handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
    }): () => void
  }
  effect?(callback: () => unknown, label?: string): unknown
  logger?: { info?(message: string): void; warn(message: string): void }
}

/** Resolve a GitHub token from config, a token file, or the environment. */
async function resolveGithubToken(config: Config | undefined): Promise<string> {
  if (config?.githubToken && config.githubToken !== '') return config.githubToken
  if (config?.githubTokenFile && config.githubTokenFile !== '') {
    try {
      const value = (await readFile(resolve(config.githubTokenFile), 'utf8')).trim()
      if (value !== '') return value
    } catch {
      /* ignore unreadable token file */
    }
  }
  return process.env.GITHUB_TOKEN ?? ''
}

export function apply(ctx: HostContext, config?: Config): void {
  const webServer = ctx.webServer
  if (webServer === undefined) return
  const installDir = resolve(config?.installDir ?? defaultInstallDir())

  const handler = (req: IncomingMessage, res: ServerResponse): void | Promise<void> => {
    return (async () => {
      const token = await resolveGithubToken(config)
      await handleApi(req, res, installDir, token)
    })()
  }

  ctx.effect?.(
    () => webServer.register({ kind: 'prefix', path: '/api/skills', handler }),
    'dsh-any-skills: api routes',
  )
  ctx.logger?.info?.(`dsh-any-skills: API ready at /api/skills/* (installDir=${installDir})`)
}

/* ---------------- request handling ---------------- */

async function handleApi(req: IncomingMessage, res: ServerResponse, installDir: string, token: string): Promise<void> {
  let url: URL
  try {
    url = new URL(req.url ?? '/', 'http://localhost')
  } catch {
    return sendJson(res, 400, { ok: false, message: 'invalid url' })
  }
  const { pathname } = url
  try {
    if (req.method === 'GET' && pathname === '/api/skills/list') {
      const skills = await listInstalled(installDir)
      return sendJson(res, 200, { ok: true, installDir, skills })
    }

    if (req.method === 'GET' && pathname === '/api/skills/sources') {
      const cwd = url.searchParams.get('cwd') || process.cwd()
      const groups = await detectSources(cwd, installDir)
      return sendJson(res, 200, { ok: true, cwd, sources: groups })
    }

    if (req.method === 'POST' && pathname === '/api/skills/import') {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'untrusted origin' })
      const body = await readJsonBody(req)
      return sendJson(res, 200, await importSkills(body, installDir, token))
    }

    if (req.method === 'POST' && pathname === '/api/skills/install') {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'untrusted origin' })
      const body = await readJsonBody(req)
      return sendJson(res, 200, await installRemote(body, installDir, token))
    }

    if (req.method === 'DELETE' && pathname === '/api/skills/uninstall') {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'untrusted origin' })
      const body = await readJsonBody(req)
      const name = typeof body?.name === 'string' ? body.name.trim() : ''
      if (name === '') return sendJson(res, 400, { ok: false, message: 'name is required' })
      return sendJson(res, 200, await uninstallSkill(installDir, name))
    }

    if (req.method === 'POST' && pathname === '/api/skills/restore') {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: 'untrusted origin' })
      const body = await readJsonBody(req)
      const name = typeof body?.name === 'string' ? body.name.trim() : ''
      const trash = typeof body?.trash === 'string' ? body.trash.trim() : ''
      if (name === '' || trash === '') return sendJson(res, 400, { ok: false, message: 'name and trash are required' })
      return sendJson(res, 200, await restoreSkill(installDir, name, trash))
    }

    sendJson(res, 404, { ok: false, message: 'not found' })
  } catch (error) {
    sendJson(res, 500, { ok: false, message: errorMessage(error) })
  }
}

/* ---------------- import / install ---------------- */

interface ImportBody {
  type?: unknown
  path?: unknown
  repository?: unknown
  cwd?: unknown
  names?: unknown
  sourceId?: unknown
}

/** POST /api/skills/import — copy skills from a detected source, a local dir, or a GitHub repo. */
async function importSkills(
  body: ImportBody,
  installDir: string,
  token: string,
): Promise<{ ok: boolean; imported: unknown[]; skipped?: string[]; message?: string; source?: string; branch?: string }> {
  const type = typeof body?.type === 'string' ? body.type : ''
  const cwd = typeof body?.cwd === 'string' && body.cwd !== '' ? body.cwd : process.cwd()
  const names = Array.isArray(body?.names) ? body.names.filter((n): n is string => typeof n === 'string') : undefined

  switch (type) {
    case 'codex':
    case 'claude':
    case 'opencode': {
      // import from the tool's detected source groups (user + project level);
      // a specific sourceId narrows it to one detected group
      const sourceId = typeof body?.sourceId === 'string' ? body.sourceId : undefined
      const groups = await detectSources(cwd, installDir)
      const matching = groups.filter((g) => g.tool === type && (sourceId === undefined || g.id === sourceId))
      const imported: unknown[] = []
      const skipped: string[] = []
      for (const group of matching) {
        if (!group.exists) continue
        for (const skill of group.skills) {
          if (names !== undefined && !names.includes(skill.name)) continue
          if (skill.installed) {
            skipped.push(skill.name)
            continue
          }
          imported.push(
            skill.kind === 'flat'
              ? await installFlatFile(skill.path, installDir)
              : await installBundleDir(skill.path, installDir),
          )
        }
      }
      return { ok: true, imported, ...(skipped.length > 0 ? { skipped } : {}) }
    }
    case 'local': {
      const path = typeof body?.path === 'string' ? body.path.trim() : ''
      if (path === '') throw new Error('local import requires a path')
      const sourceDir = resolve(path)
      if (!(await pathExists(sourceDir))) throw new Error(`路径不存在: ${sourceDir}`)
      const imported = await installAllFromRoot(sourceDir, installDir)
      if (imported.length === 0) {
        throw new Error(`路径中没有找到有效的技能（需要包含 SKILL.md 的目录或 .md 技能文件）: ${sourceDir}`)
      }
      return { ok: true, imported }
    }
    case 'github': {
      const repository = typeof body?.repository === 'string' ? body.repository.trim() : ''
      if (repository === '') throw new Error('github import requires a repository')
      if (parseRepoInput(repository) === undefined) {
        throw new Error('无效的 GitHub 仓库地址（支持 owner/repo、HTTPS URL、SSH URL 或 Git URL）')
      }
      const result = await installFromGitHub(repository, installDir, token)
      return { ok: true, imported: result.installed, source: result.repo, branch: result.branch }
    }
    default:
      throw new Error(`未知的导入类型: ${type || '(empty)'}（支持 codex / claude / opencode / local / github）`)
  }
}

/** POST /api/skills/install — batch install from GitHub / npm. */
async function installRemote(body: { sources?: unknown }, installDir: string, token: string): Promise<{ ok: boolean; results: unknown[] }> {
  const sources = Array.isArray(body?.sources) ? body.sources : []
  if (sources.length === 0) {
    // accept a single shorthand { type, value } / { type, repository } / { type, package }
    const single = (body as { type?: unknown; value?: unknown; repository?: unknown; package?: unknown })
    if (typeof single?.type === 'string') {
      const value = typeof single.value === 'string' ? single.value
        : typeof single.repository === 'string' ? single.repository
          : typeof single.package === 'string' ? single.package
            : ''
      if (value !== '') sources.push({ type: single.type, value })
    }
  }
  if (sources.length === 0) throw new Error('install requires sources: [{type: "github"|"npm", value}]')

  const results: unknown[] = []
  for (const source of sources) {
    const record = typeof source === 'object' && source !== null ? source as Record<string, unknown> : {}
    const type = typeof record.type === 'string' ? record.type : ''
    const value = typeof record.value === 'string' ? record.value.trim() : ''
    try {
      if (type === 'github') {
        if (value === '') throw new Error('github source requires a value')
        results.push({ source: value, ok: true, ...(await installFromGitHub(value, installDir, token)) })
      } else if (type === 'npm') {
        if (value === '') throw new Error('npm source requires a value')
        results.push({ source: value, ok: true, ...(await installFromNpm(value, installDir)) })
      } else {
        results.push({ source: value || String(record.type ?? ''), ok: false, message: `未知的安装类型: ${type}` })
      }
    } catch (error) {
      results.push({ source: value || String(record.type ?? ''), ok: false, message: errorMessage(error) })
    }
  }
  return { ok: true, results }
}

/* ---------------- helpers ---------------- */

/** Same-origin guard for mutating endpoints. */
function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  const host = req.headers.host
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8').trim()
        resolvePromise(text === '' ? {} : JSON.parse(text) as Record<string, unknown>)
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const data = Buffer.from(JSON.stringify(body), 'utf8')
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': data.length,
  })
  res.end(data)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
