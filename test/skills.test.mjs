/**
 * dsh-any-skills — unit tests for the core logic (run against the built
 * index.js bundle: `pnpm test`).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  normalizeSkillName,
  parseSkillText,
  parseRepoInput,
  parseNpmSpec,
  scanDirectory,
  installAllFromRoot,
  uninstallSkill,
  restoreSkill,
  detectSources,
  installSkillsFromTree,
  downloadTarball,
  SPARSE_EXCLUSIONS,
} from '../index.js'

/* ---------------- parseSkillText ---------------- */

test('parseSkillText: accepts a valid bundle skill', () => {
  const raw = `---
name: my-skill
description: Does a thing.
whenToUse: When needed.
---
# My Skill

Body here.
`
  const parsed = parseSkillText(raw)
  assert.ok(parsed)
  assert.equal(parsed.name, 'my-skill')
  assert.equal(parsed.description, 'Does a thing.')
  assert.equal(parsed.whenToUse, 'When needed.')
  assert.match(parsed.body, /Body here/)
})

test('parseSkillText: accepts quoted description', () => {
  const raw = `---
name: quoted-desc
description: "Has, commas, and: colons"
---
Body.
`
  const parsed = parseSkillText(raw)
  assert.ok(parsed)
  assert.equal(parsed.description, 'Has, commas, and: colons')
})

test('parseSkillText: parses optional localized description/whenToUse fields', () => {
  const raw = `---
name: my-skill
description: Does a thing.
description_zh: 做一件事。
description_en: Does a thing in English.
whenToUse: When needed.
whenToUse_zh: 需要的时候用。
whenToUse_en: When needed (en).
---
Body.
`
  const parsed = parseSkillText(raw)
  assert.ok(parsed)
  assert.equal(parsed.description, 'Does a thing.')
  assert.equal(parsed.descriptionZh, '做一件事。')
  assert.equal(parsed.descriptionEn, 'Does a thing in English.')
  assert.equal(parsed.whenToUse, 'When needed.')
  assert.equal(parsed.whenToUseZh, '需要的时候用。')
  assert.equal(parsed.whenToUseEn, 'When needed (en).')
})

test('parseSkillText: localized fields are absent when not provided', () => {
  const parsed = parseSkillText('---\nname: plain\ndescription: Only one language.\n---\nBody.\n')
  assert.ok(parsed)
  assert.equal(parsed.descriptionZh, undefined)
  assert.equal(parsed.descriptionEn, undefined)
  assert.equal(parsed.whenToUse, undefined)
  assert.equal(parsed.whenToUseZh, undefined)
  assert.equal(parsed.whenToUseEn, undefined)
})

test('parseSkillText: rejects missing frontmatter / name / description', () => {
  assert.equal(parseSkillText('# no frontmatter\nbody'), undefined)
  assert.equal(parseSkillText('---\nname: only-name\n---\nbody'), undefined)
  assert.equal(parseSkillText('---\ndescription: only-desc\n---\nbody'), undefined)
  assert.equal(parseSkillText('---\nname: 123\n---\nbody'), undefined)
})

test('parseSkillText: rejects invalid skill names', () => {
  assert.equal(parseSkillText('---\nname: "My Skill!"\ndescription: x\n---\n'), undefined)
  assert.equal(parseSkillText('---\nname: "under_score"\ndescription: x\n---\n'), undefined)
  assert.equal(parseSkillText('---\nname: "UPPER"\ndescription: x\n---\n'), undefined)
})

/* ---------------- normalizeSkillName ---------------- */

test('normalizeSkillName: kebab-case conversion', () => {
  assert.equal(normalizeSkillName('My Cool Skill'), 'my-cool-skill')
  assert.equal(normalizeSkillName('under_score'), 'under-score')
  assert.equal(normalizeSkillName('  Spaces  '), 'spaces')
  assert.equal(normalizeSkillName('!!junk!!'), 'junk')
  assert.equal(normalizeSkillName(''), '')
  assert.equal(normalizeSkillName('a.b_c'), 'a-b-c')
})

/* ---------------- parseRepoInput ---------------- */

test('parseRepoInput: accepts all four GitHub forms', () => {
  assert.deepEqual(parseRepoInput('owner/repo'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoInput('owner/repo.git'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoInput('https://github.com/owner/repo'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoInput('https://github.com/owner/repo/tree/main'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoInput('https://github.com/owner/repo.git'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoInput('git@github.com:owner/repo.git'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoInput('ssh://git@github.com/owner/repo'), { owner: 'owner', repo: 'repo' })
  assert.deepEqual(parseRepoInput('owner/repo#dev'), { owner: 'owner', repo: 'repo', ref: 'dev' })
})

test('parseRepoInput: rejects non-GitHub or invalid input', () => {
  assert.equal(parseRepoInput(''), undefined)
  assert.equal(parseRepoInput('owner'), undefined)
  assert.equal(parseRepoInput('https://gitlab.com/owner/repo'), undefined)
  assert.equal(parseRepoInput('git@gitlab.com:owner/repo.git'), undefined)
  assert.equal(parseRepoInput('https://example.com/owner/repo'), undefined)
})

/* ---------------- parseNpmSpec ---------------- */

test('parseNpmSpec: names and versions', () => {
  assert.deepEqual(parseNpmSpec('some-pkg'), { name: 'some-pkg' })
  assert.deepEqual(parseNpmSpec('some-pkg@1.2.3'), { name: 'some-pkg', version: '1.2.3' })
  assert.deepEqual(parseNpmSpec('@scope/pkg'), { name: '@scope/pkg' })
  assert.deepEqual(parseNpmSpec('@scope/pkg@2.0.0'), { name: '@scope/pkg', version: '2.0.0' })
  assert.equal(parseNpmSpec(''), undefined)
  assert.equal(parseNpmSpec('UPPER CASE'), undefined)
})

/* ---------------- filesystem flow ---------------- */

test('installAllFromRoot + listInstalled + uninstall round-trip', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-any-skills-test-'))
  try {
    const source = join(root, 'source')
    await mkdir(join(source, 'alpha'), { recursive: true })
    await writeFile(join(source, 'alpha', 'SKILL.md'), `---\nname: alpha-skill\ndescription: First skill.\n---\nBody A\n`)
    await writeFile(join(source, 'beta.md'), `---\nname: beta-skill\ndescription: Second skill.\n---\nBody B\n`)
    await writeFile(join(source, 'not-a-skill.md'), '# plain markdown\nno frontmatter\n')

    const installDir = join(root, 'install')
    const installed = await installAllFromRoot(source, installDir)
    assert.equal(installed.length, 2)

    const listed = await scanDirectory(installDir)
    assert.deepEqual(listed.map((s) => s.name).sort(), ['alpha-skill', 'beta-skill'])
    assert.ok(listed.every((s) => s.description !== ''))

    const uninstall = await uninstallSkill(installDir, 'alpha-skill')
    assert.ok(uninstall.ok)
    assert.match(uninstall.trash, /^\.trash-\d{14}-alpha-skill$/)
    const after = await scanDirectory(installDir)
    assert.deepEqual(after.map((s) => s.name), ['beta-skill'])

    // restore round-trip
    const restored = await restoreSkill(installDir, 'alpha-skill', uninstall.trash)
    assert.ok(restored.ok)
    const restoredList = await scanDirectory(installDir)
    assert.deepEqual(restoredList.map((s) => s.name).sort(), ['alpha-skill', 'beta-skill'])

    // restore rejects mismatched / invalid trash
    const bad = await restoreSkill(installDir, 'alpha-skill', '.trash-20260101000000-nope-skill')
    assert.equal(bad.ok, false)
    const bad2 = await restoreSkill(installDir, 'alpha-skill', 'not-a-trash')
    assert.equal(bad2.ok, false)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('installBundleDir overwrites an existing same-name skill', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-any-skills-test-'))
  try {
    const installDir = join(root, 'install')
    const source = join(root, 'source')
    await mkdir(source, { recursive: true })
    await writeFile(join(source, 'SKILL.md'), '---\nname: v1\ndescription: old\n---\nOld\n')
    const first = await installAllFromRoot(source, installDir)
    assert.equal(first[0].name, 'v1')
    assert.equal(first[0].description, 'old')

    await writeFile(join(source, 'SKILL.md'), '---\nname: v1\ndescription: new\n---\nNew\n')
    const second = await installAllFromRoot(source, installDir)
    assert.equal(second[0].name, 'v1')
    assert.equal(second[0].description, 'new')
    // re-import replaces the bundle instead of duplicating it
    assert.deepEqual((await scanDirectory(installDir)).map((s) => s.name), ['v1'])
    assert.equal((await scanDirectory(installDir))[0].description, 'new')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('detectSources: finds project-level tool skill dirs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-any-skills-test-'))
  try {
    // .git marks the project root
    await mkdir(join(root, '.git'), { recursive: true })
    await mkdir(join(root, '.claude', 'skills', 'proj-skill'), { recursive: true })
    await writeFile(join(root, '.claude', 'skills', 'proj-skill', 'SKILL.md'), '---\nname: proj-skill\ndescription: Project skill.\n---\nBody\n')
    await mkdir(join(root, '.opencode', 'skills'), { recursive: true })

    const groups = await detectSources(root)
    const claudeProject = groups.find((g) => g.id === 'claude-project')
    assert.ok(claudeProject)
    assert.equal(claudeProject.exists, true)
    assert.deepEqual(claudeProject.skills.map((s) => s.name), ['proj-skill'])

    const opencodeProject = groups.find((g) => g.id === 'opencode-project')
    assert.ok(opencodeProject)
    assert.equal(opencodeProject.exists, true)
    assert.equal(opencodeProject.skills.length, 0)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('installSkillsFromTree: deduplicates the same skill name across collection dirs', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-any-skills-test-'))
  try {
    const installDir = join(root, 'install')
    const tree = join(root, 'tree')
    // 同一技能名出现在 .claude/skills 与 .agents/skills → 只装一次（不重复覆盖）
    await mkdir(join(tree, '.claude', 'skills', 'shared'), { recursive: true })
    await writeFile(join(tree, '.claude', 'skills', 'shared', 'SKILL.md'), '---\nname: shared-skill\ndescription: From claude.\n---\nBody\n')
    await mkdir(join(tree, '.agents', 'skills', 'shared'), { recursive: true })
    await writeFile(join(tree, '.agents', 'skills', 'shared', 'SKILL.md'), '---\nname: shared-skill\ndescription: From agents.\n---\nBody\n')
    await mkdir(join(tree, '.codex', 'skills', 'unique'), { recursive: true })
    await writeFile(join(tree, '.codex', 'skills', 'unique', 'SKILL.md'), '---\nname: unique-skill\ndescription: Only here.\n---\nBody\n')

    const result = await installSkillsFromTree(tree, installDir, 'fallback')
    assert.deepEqual(result.map((s) => s.name).sort(), ['shared-skill', 'unique-skill'], 'same name installed once')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('downloadTarball: retries on transient network failures and succeeds', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-any-skills-dl-'))
  const originalFetch = globalThis.fetch
  try {
    let calls = 0
    globalThis.fetch = async () => {
      calls++
      if (calls < 3) throw new Error('socket hang up') // 前两次网络抖动
      return new Response(Buffer.from('fake-tarball-bytes'))
    }
    await downloadTarball('https://example.invalid/x.tar.gz', 'test', join(root, 'out.tar.gz'))
    assert.equal(calls, 3, 'retried twice after transient failures')
    const { readFileSync } = await import('node:fs')
    assert.equal(readFileSync(join(root, 'out.tar.gz'), 'utf8'), 'fake-tarball-bytes')
  } finally {
    globalThis.fetch = originalFetch
    await rm(root, { recursive: true, force: true })
  }
})

test('downloadTarball: reports a friendly message after repeated timeouts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-any-skills-dl-'))
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => {
      const err = new Error('The operation was aborted due to timeout')
      err.name = 'AbortError'
      throw err
    }
    await assert.rejects(
      downloadTarball('https://example.invalid/big.tar.gz', 'big-repo', join(root, 'out.tar.gz')),
      /超时|timeout/i,
    )
  } finally {
    globalThis.fetch = originalFetch
    await rm(root, { recursive: true, force: true })
  }
})

test('SPARSE_EXCLUSIONS: excludes heavy dirs but never skill locations', () => {
  for (const heavy of ['/assets/', '/docs/', '/node_modules/', '/dist/', '/build/', '/public/']) {
    assert.ok(SPARSE_EXCLUSIONS.includes(heavy), `must exclude ${heavy}`)
  }
  for (const skillPath of ['/skills/', '/.claude/skills/', '/.agents/skills/', '/.codex/skills/']) {
    assert.ok(!SPARSE_EXCLUSIONS.includes(skillPath), `must NOT exclude ${skillPath}`)
  }
})

test('installSkillsFromTree: single-skill repo, collection dirs and top-level bundles', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-any-skills-test-'))
  try {
    const installDir = join(root, 'install')
    const tree = join(root, 'tree')
    // 1) single-skill repo: <root>/SKILL.md -> whole repo as one skill
    await mkdir(join(tree, 'single'), { recursive: true })
    await writeFile(join(tree, 'single', 'SKILL.md'), '---\nname: single-skill\ndescription: One.\n---\nBody\n')

    const single = await installSkillsFromTree(join(tree, 'single'), installDir, 'fallback-name')
    assert.deepEqual(single.map((s) => s.name), ['single-skill'])

    // 2) multi-skill repo: skills/ + .agents/skills + top-level dirs
    const multi = join(tree, 'multi')
    await mkdir(join(multi, 'skills', 'from-skills'), { recursive: true })
    await writeFile(join(multi, 'skills', 'from-skills', 'SKILL.md'), '---\nname: from-skills\ndescription: In skills dir.\n---\nBody\n')
    await writeFile(join(multi, 'skills', 'flat-skill.md'), '---\nname: flat-skill\ndescription: Flat in skills dir.\n---\nBody\n')
    await mkdir(join(multi, '.agents', 'skills', 'from-agents'), { recursive: true })
    await writeFile(join(multi, '.agents', 'skills', 'from-agents', 'SKILL.md'), '---\nname: from-agents\ndescription: In .agents dir.\n---\nBody\n')
    await mkdir(join(multi, 'top-level'), { recursive: true })
    await writeFile(join(multi, 'top-level', 'SKILL.md'), '---\nname: top-level\ndescription: Top level bundle.\n---\nBody\n')
    await mkdir(join(multi, 'not-a-skill'), { recursive: true })
    await writeFile(join(multi, 'not-a-skill', 'README.md'), 'not a skill\n')

    const multiResult = await installSkillsFromTree(multi, installDir, 'fallback')
    assert.deepEqual(multiResult.map((s) => s.name).sort(), ['flat-skill', 'from-agents', 'from-skills', 'top-level'])

    // 3) no skills -> empty
    const emptyDir = join(tree, 'empty-dir')
    await mkdir(emptyDir, { recursive: true })
    await writeFile(join(emptyDir, 'README.md'), 'no skills here\n')
    const empty = await installSkillsFromTree(emptyDir, join(root, 'empty-install'), 'x')
    assert.deepEqual(empty, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

/* ---------------- uninstall / restore rejection matrix ---------------- */

test('uninstallSkill: rejects invalid names and missing skills', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-as-edge-'))
  try {
    const bad = await uninstallSkill(dir, 'Bad Name!')
    assert.equal(bad.ok, false)
    assert.match(bad.message, /非法技能名/)

    const missing = await uninstallSkill(dir, 'no-such-skill')
    assert.equal(missing.ok, false)
    assert.match(missing.message, /未找到已安装的技能/)

    const { readdir } = await import('node:fs/promises')
    assert.deepEqual(await readdir(dir), [], 'no stray trash entries created')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('restoreSkill: rejects invalid names, malformed/mismatched/missing trash', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-as-edge-'))
  try {
    const badName = await restoreSkill(dir, 'Bad Name!', '.trash-20260101000000-Bad-Name')
    assert.equal(badName.ok, false)
    assert.match(badName.message, /非法技能名/)

    const malformed = await restoreSkill(dir, 'alpha', 'not-a-trash')
    assert.equal(malformed.ok, false)
    assert.match(malformed.message, /非法回收目录/)

    const mismatched = await restoreSkill(dir, 'alpha', '.trash-20260101000000-beta')
    assert.equal(mismatched.ok, false)
    assert.match(mismatched.message, /不匹配/)

    const missing = await restoreSkill(dir, 'alpha', '.trash-20260101000000-alpha')
    assert.equal(missing.ok, false)
    assert.match(missing.message, /未找到回收目录/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

/* ---------------- build artifact sanity ---------------- */

test('build artifacts: index.js and client.js ship the current bundle markers', () => {
  const index = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.match(index, /api\/skills\/restore/, 'index.js carries the restore route')
  assert.match(client, /__ModuleLoader__/, 'client.js carries the module-loader handshake')
  assert.match(client, /dsh-any-skills:show-picker/, 'client.js carries the picker-visibility preference')
  assert.match(client, /dsh-as-switch/, 'client.js carries the settings switch styles')
})
