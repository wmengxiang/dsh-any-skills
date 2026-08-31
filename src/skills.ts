/**
 * dsh-any-skills — core skill filesystem logic.
 *
 * Skills are the DSH-native Agent Skill format: a directory bundle
 * `<name>/SKILL.md` or a flat `<name>.md`, whose frontmatter carries at least
 * `name` and `description`. DSH's built-in `dsh-skill-filesystem` provider
 * watches `~/.dsh/skills` (the `user-dsh` root, rank 400) automatically, so
 * anything we write there is picked up by the model and by the native
 * `/skill-name` user-invocation gesture without any further registration.
 *
 * Skill names must match DSH's kebab-case rule:
 *   /^[a-z0-9]+(?:-[a-z0-9]+)*$/   (see @deepseek-ai/dsh-skill)
 * Imported names are normalized accordingly (underscores become hyphens).
 */
import { cp, mkdir, readFile, readdir, rename, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { parse as parseYaml } from 'yaml'

/** DSH's exact skill-name rule — copied from @deepseek-ai/dsh-skill. */
export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface SkillSummary {
  /** Normalized kebab-case skill name. */
  name: string
  /** Description from the SKILL.md frontmatter. */
  description: string
  /** Optional locale-keyed description (SKILL.md frontmatter `description_zh` / `description_en`). */
  descriptionZh?: string
  descriptionEn?: string
  /** Optional "when to use" guidance (SKILL.md frontmatter `whenToUse`). */
  whenToUse?: string
  /** Optional locale-keyed "when to use" (`whenToUse_zh` / `whenToUse_en`). */
  whenToUseZh?: string
  whenToUseEn?: string
  /** Absolute path of the installed skill directory (bundle) or .md file (flat). */
  path: string
  /** `bundle` = <name>/SKILL.md directory, `flat` = <name>.md file. */
  kind: 'bundle' | 'flat'
  /** Set true when listing detected sources and the skill is already installed. */
  installed?: boolean
}

export interface SkillSourceGroup {
  /** Stable source id, e.g. `codex-user`. */
  id: string
  /** Human-readable label. */
  label: string
  /** Tool the source belongs to: codex | claude | opencode. */
  tool: 'codex' | 'claude' | 'opencode'
  /** Absolute path of the scanned skills directory. */
  path: string
  /** Whether the directory exists. */
  exists: boolean
  /** Skills found there. */
  skills: SkillSummary[]
}

/** Resolve the DSH home directory (defaults to ~/.dsh, honoring DSH_HOME). */
export function dshHome(): string {
  const env = process.env.DSH_HOME
  return env !== undefined && env !== '' ? resolve(env) : join(homedir(), '.dsh')
}

/** Default skills installation directory: ~/.dsh/skills. */
export function defaultInstallDir(): string {
  return join(dshHome(), 'skills')
}

/**
 * Normalize an arbitrary skill name to DSH kebab-case:
 * lowercase, underscores and runs of other junk become single hyphens.
 * Returns '' when nothing usable remains.
 */
export function normalizeSkillName(raw: string): string {
  const s = String(raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s
}

/** Whether a name is a valid DSH skill name. */
export function isValidSkillName(name: string): boolean {
  return SKILL_NAME_RE.test(name)
}

export interface ParsedSkill {
  name: string
  description: string
  descriptionZh?: string
  descriptionEn?: string
  whenToUse?: string
  whenToUseZh?: string
  whenToUseEn?: string
  body: string
}

/**
 * Parse a SKILL.md document: requires a leading `---` YAML frontmatter block
 * with string `name` and `description`; mirrors dsh-skill-filesystem's rules.
 * Returns undefined for files that are not valid skills.
 */
export function parseSkillText(raw: string): ParsedSkill | undefined {
  if (typeof raw !== 'string') return undefined
  const firstLineEnd = raw.indexOf('\n')
  if (firstLineEnd < 0) return undefined
  if (raw.slice(0, firstLineEnd).replace(/\r$/, '') !== '---') return undefined

  const start = firstLineEnd + 1
  const closing = findClosingFrontmatter(raw, start)
  if (closing === undefined) return undefined

  let data: unknown
  try {
    data = parseYaml(raw.slice(start, closing.start))
  } catch {
    return undefined
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return undefined

  const record = data as Record<string, unknown>
  const name = stringField(record, 'name')
  const description = stringField(record, 'description')
  if (name === undefined || description === undefined) return undefined
  if (!isValidSkillName(name)) return undefined

  const whenToUse = optionalString(record, 'whenToUse')
  const descriptionZh = optionalString(record, 'description_zh')
  const descriptionEn = optionalString(record, 'description_en')
  const whenToUseZh = optionalString(record, 'whenToUse_zh')
  const whenToUseEn = optionalString(record, 'whenToUse_en')
  return {
    name,
    description,
    ...(whenToUse !== undefined ? { whenToUse } : {}),
    ...(descriptionZh !== undefined ? { descriptionZh } : {}),
    ...(descriptionEn !== undefined ? { descriptionEn } : {}),
    ...(whenToUseZh !== undefined ? { whenToUseZh } : {}),
    ...(whenToUseEn !== undefined ? { whenToUseEn } : {}),
    body: raw.slice(closing.bodyStart).trim(),
  }
}

function findClosingFrontmatter(raw: string, start: number): { start: number; bodyStart: number } | undefined {
  let lineStart = start
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline
    if (raw.slice(lineStart, lineEnd).replace(/\r$/, '') === '---') {
      return { start: lineStart, bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1 }
    }
    if (nextNewline < 0) return undefined
    lineStart = nextNewline + 1
  }
  return undefined
}

function stringField(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function optionalString(data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return false
    throw error
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return false
    throw error
  }
}

function isErrno(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === code
}

/** Read a skill document at a path; returns undefined when absent/invalid. */
export async function readSkillDoc(mdPath: string): Promise<ParsedSkill | undefined> {
  let raw: string
  try {
    raw = await readFile(mdPath, 'utf8')
  } catch (error) {
    if (isErrno(error, 'ENOENT')) return undefined
    throw error
  }
  return parseSkillText(raw)
}

/**
 * Scan a directory that contains skill bundles (<dir>/SKILL.md) or flat
 * skills (<dir>/<name>.md). Entries are sorted by name.
 */
export async function scanDirectory(root: string): Promise<SkillSummary[]> {
  let entries
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch (error) {
    if (isErrno(error, 'ENOENT') || isErrno(error, 'ENOTDIR')) return []
    throw error
  }

  const found: SkillSummary[] = []
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.')) continue
    const entryPath = join(root, entry.name)
    if (entry.isDirectory()) {
      const parsed = await readSkillDoc(join(entryPath, 'SKILL.md'))
      if (parsed === undefined) continue
      found.push(toSummary(parsed, entryPath, 'bundle'))
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const parsed = await readSkillDoc(entryPath)
      if (parsed === undefined) continue
      found.push(toSummary(parsed, entryPath, 'flat'))
    }
  }
  return found
}

/** 把 ParsedSkill 组装成对外暴露的 SkillSummary（透传多语言字段）。 */
function toSummary(parsed: ParsedSkill, path: string, kind: 'bundle' | 'flat'): SkillSummary {
  return {
    name: parsed.name,
    description: parsed.description,
    ...(parsed.descriptionZh !== undefined ? { descriptionZh: parsed.descriptionZh } : {}),
    ...(parsed.descriptionEn !== undefined ? { descriptionEn: parsed.descriptionEn } : {}),
    ...(parsed.whenToUse !== undefined ? { whenToUse: parsed.whenToUse } : {}),
    ...(parsed.whenToUseZh !== undefined ? { whenToUseZh: parsed.whenToUseZh } : {}),
    ...(parsed.whenToUseEn !== undefined ? { whenToUseEn: parsed.whenToUseEn } : {}),
    path,
    kind,
  }
}

/** List every installed skill under installDir. */
export async function listInstalled(installDir: string): Promise<SkillSummary[]> {
  return scanDirectory(installDir)
}

/**
 * Install one skill from a source directory (must contain SKILL.md) into
 * installDir/<name>/ . Returns the installed summary or throws.
 */
export async function installBundleDir(sourceDir: string, installDir: string): Promise<SkillSummary> {
  const parsed = await readSkillDoc(join(sourceDir, 'SKILL.md'))
  if (parsed === undefined) {
    throw new Error(`not a skill: ${sourceDir} (missing valid SKILL.md with name/description frontmatter)`)
  }
  const target = join(installDir, parsed.name)
  await mkdir(installDir, { recursive: true })
  await rm(target, { recursive: true, force: true })
  await cp(sourceDir, target, {
    recursive: true,
    force: true,
    filter: (src) => {
      const base = basename(src)
      return base !== '.git' && base !== '.gitignore' && base !== '.DS_Store'
    },
  })
  return toSummary(parsed, target, 'bundle')
}

/** Install one flat <name>.md skill file into installDir/<name>.md . */
export async function installFlatFile(sourceFile: string, installDir: string, name?: string): Promise<SkillSummary> {
  const parsed = await readSkillDoc(sourceFile)
  if (parsed === undefined) {
    throw new Error(`not a skill: ${sourceFile} (missing valid frontmatter with name/description)`)
  }
  const targetName = name ?? parsed.name
  const target = join(installDir, `${targetName}.md`)
  await mkdir(installDir, { recursive: true })
  await rm(target, { force: true })
  await cp(sourceFile, target, { force: true })
  return toSummary(parsed, target, 'flat')
}

/**
 * Install every skill found in a scanned root (bundles and flat files).
 * Returns the freshly installed summaries. Existing same-name skills are
 * overwritten.
 */
export async function installAllFromRoot(root: string, installDir: string): Promise<SkillSummary[]> {
  const found = await scanDirectory(root)
  const installed: SkillSummary[] = []
  for (const skill of found) {
    if (skill.kind === 'bundle') {
      installed.push(await installBundleDir(skill.path, installDir))
    } else {
      installed.push(await installFlatFile(skill.path, installDir))
    }
  }
  return installed
}

/** Move an installed skill into .trash-<timestamp>-<name> (recoverable). */
export async function uninstallSkill(
  installDir: string,
  name: string,
): Promise<{ ok: boolean; message: string; trash?: string }> {
  if (!/^[\w.-]+$/.test(name)) return { ok: false, message: `非法技能名: ${name}` }
  const target = join(installDir, name)
  if (!(await pathExists(target))) return { ok: false, message: `未找到已安装的技能: ${name}` }
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const trash = join(installDir, `.trash-${ts}-${name}`)
  await rename(target, trash)
  return { ok: true, message: `已卸载 ${name}（移入 ${basename(trash)}，可手动恢复）`, trash: basename(trash) }
}

/** Restore a trashed skill back to installDir/<name> . */
export async function restoreSkill(
  installDir: string,
  name: string,
  trash: string,
): Promise<{ ok: boolean; message: string }> {
  if (!isValidSkillName(name)) return { ok: false, message: `非法技能名: ${name}` }
  if (!/^\.trash-\d{14}-[\w.-]+$/.test(trash)) return { ok: false, message: `非法回收目录名: ${trash}` }
  if (!trash.endsWith(`-${name}`)) return { ok: false, message: `回收目录与技能名不匹配: ${trash} / ${name}` }
  const trashPath = join(installDir, trash)
  if (!(await pathExists(trashPath))) return { ok: false, message: `未找到回收目录: ${trash}` }
  const target = join(installDir, name)
  await rm(target, { recursive: true, force: true })
  await rename(trashPath, target)
  return { ok: true, message: `已恢复 ${name}（从 ${trash} 移回安装目录）` }
}

/** Walk up from cwd to the nearest directory containing a `.git` entry. */
export async function findProjectRoot(cwd: string): Promise<string> {
  let current = resolve(cwd)
  for (;;) {
    if (await pathExists(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

/** Detect the user-level and project-level skill roots of each tool. */
export async function detectSources(cwd: string, installDir: string = defaultInstallDir()): Promise<SkillSourceGroup[]> {
  const projectRoot = await findProjectRoot(cwd)
  const home = homedir()
  const candidates: Array<{
    id: string
    label: string
    tool: SkillSourceGroup['tool']
    path: string
  }> = [
    { id: 'codex-user', label: 'Codex（用户级）~/.codex/skills', tool: 'codex', path: join(home, '.codex', 'skills') },
    { id: 'codex-project', label: 'Codex（项目级）.codex/skills', tool: 'codex', path: join(projectRoot, '.codex', 'skills') },
    { id: 'claude-user', label: 'Claude Code（用户级）~/.claude/skills', tool: 'claude', path: join(home, '.claude', 'skills') },
    { id: 'claude-project', label: 'Claude Code（项目级）.claude/skills', tool: 'claude', path: join(projectRoot, '.claude', 'skills') },
    { id: 'opencode-project', label: 'OpenCode（项目级）.opencode/skills', tool: 'opencode', path: join(projectRoot, '.opencode', 'skills') },
    { id: 'agents-project', label: 'OpenCode（项目级）.agents/skills', tool: 'opencode', path: join(projectRoot, '.agents', 'skills') },
  ]

  const installed = new Set((await listInstalled(installDir)).map((s) => s.name))

  const groups: SkillSourceGroup[] = []
  for (const candidate of candidates) {
    const exists = await isDirectory(candidate.path)
    const skills = exists ? await scanDirectory(candidate.path) : []
    for (const skill of skills) skill.installed = installed.has(skill.name)
    groups.push({ ...candidate, exists, skills })
  }
  return groups
}

/** Locate one detected source group by id (used by the import endpoint). */
export async function resolveSourceGroup(sourceId: string, cwd: string): Promise<SkillSourceGroup | undefined> {
  const groups = await detectSources(cwd)
  return groups.find((g) => g.id === sourceId)
}

/** Recursively walk a directory tree (skipping .git), yielding file paths. */
export async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = []
  const stack = [root]
  while (stack.length > 0) {
    const dir = stack.pop()!
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === '.gitignore' || entry.name === '.DS_Store') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile()) out.push(full)
    }
  }
  return out.sort()
}
