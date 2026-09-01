/**
 * dsh-any-skills — client bundle handshake test.
 *
 * Loads the built lib client.js in a Node vm sandbox with a stub
 * `window.__ModuleLoader__`, invokes the factory with a fake `require("react")`,
 * then runs `apply(ctx)` against a fake slots registry to verify both Slot
 * contributions (composer picker + settings section) register cleanly.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

/** Minimal react stub: createElement returns a plain descriptor. */
function createElementStub(type, props, ...children) {
  return { type, props: props ?? null, children: children.length === 1 ? children[0] : children }
}

function loadClientBundle(extraSandbox = {}) {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  let captured = null
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(definition) {
          captured = definition
        },
      },
    },
    console,
    ...extraSandbox,
  }
  sandbox.window.window = sandbox.window
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox)
  assert.ok(captured, 'client bundle must call window.__ModuleLoader__.load')
  assert.equal(captured.id, 'dsh-any-skills')

  const factoryResult = captured.factory((specifier) => {
    if (specifier === 'react') {
      return {
        createElement: createElementStub,
        useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => undefined],
        useCallback: (fn) => fn,
        useEffect: () => undefined,
        useRef: (initial) => ({ current: initial ?? null }),
      }
    }
    throw new Error(`unexpected require: ${specifier}`)
  })
  return factoryResult
}

test('client bundle: registers composer picker + settings section', () => {
  const { inject, apply } = loadClientBundle()
  // the array comes from the vm realm; compare element-wise
  assert.deepEqual([...inject], ['slots'], 'inject slots only')

  const registrations = []
  const fakeSlots = {
    inject(key, callback) {
      registrations.push({ key, callback })
      return () => undefined
    },
    register(opts, component) {
      return { opts, component }
    },
  }
  const ctx = {
    slots: fakeSlots,
    get() {
      return undefined // no workspaces service — the settings page must not depend on it
    },
    effect(callback) {
      // real Cordis runs the effect body immediately
      return callback() ?? (() => undefined)
    },
  }

  apply(ctx)
  const keys = registrations.map((r) => r.key)
  assert.ok(keys.includes('conversation.input.right'), 'composer slot registered')
  assert.ok(keys.includes('settings.section'), 'settings slot registered')

  const composer = registrations.find((r) => r.key === 'conversation.input.right')
  const rendered = composer.callback()
  assert.equal(rendered.opts.name, 'conversation.input.right')
  assert.equal(rendered.opts.id, 'any-skills-picker')
  assert.equal(typeof rendered.component, 'function')

  const settings = registrations.find((r) => r.key === 'settings.section')
  const settingsRendered = settings.callback()
  assert.equal(settingsRendered.opts.id, 'skills')
  assert.equal(settingsRendered.opts.label, 'Skill 管理')
  // no directory-picker inject anymore (scheme A: no native picker entry)
  assert.equal(settingsRendered.opts.inject, undefined)

  // the composer component renders without throwing (open=false)
  const tree = rendered.component({ session: { sessionId: 's1' }, input: { draft: 'hello' }, inputActions: { setDraft: () => undefined } })
  assert.ok(tree !== null && typeof tree === 'object')
})

test('client bundle: picker respects the show-picker preference', () => {
  // default (no localStorage): picker renders
  const enabled = loadClientBundle()
  const { inject, apply } = enabled
  const registrations = []
  const ctx = {
    slots: {
      inject(key, callback) {
        registrations.push({ key, callback })
        return () => undefined
      },
      register(opts, component) {
        return { opts, component }
      },
    },
    effect(callback) {
      return callback() ?? (() => undefined)
    },
  }
  apply(ctx)
  const composer = registrations.find((r) => r.key === 'conversation.input.right').callback()
  assert.ok(composer.component({}) !== null, 'picker renders by default')

  // localStorage says '0' (disabled): picker renders null
  const disabled = loadClientBundle({
    localStorage: { getItem: () => '0', setItem: () => undefined },
  })
  const registrations2 = []
  const ctx2 = {
    slots: {
      inject(key, callback) {
        registrations2.push({ key, callback })
        return () => undefined
      },
      register(opts, component) {
        return { opts, component }
      },
    },
    effect(callback) {
      return callback() ?? (() => undefined)
    },
  }
  disabled.apply(ctx2)
  const composer2 = registrations2.find((r) => r.key === 'conversation.input.right').callback()
  assert.equal(composer2.component({}), null, 'picker hidden when disabled')
})

test('client bundle: buildInsertedDraft appends at end when no caret range', () => {
  const { buildInsertedDraft } = loadClientBundle()
  // vm realm 对象原型不同，strict deepEqual 不可用，逐字段断言
  assert.deepEqual({ ...buildInsertedDraft('hello', 'git') }, { text: 'hello /git ', caret: 11 })
  assert.deepEqual({ ...buildInsertedDraft('', 'git') }, { text: '/git ', caret: 5 })
  assert.deepEqual({ ...buildInsertedDraft('hello ', 'git') }, { text: 'hello /git ', caret: 11 })
  assert.deepEqual({ ...buildInsertedDraft('hello\n', 'git') }, { text: 'hello\n/git ', caret: 11 })
})

test('client bundle: buildInsertedDraft inserts at the caret position', () => {
  const { buildInsertedDraft } = loadClientBundle()
  assert.deepEqual({ ...buildInsertedDraft('hello world', 'git', { start: 5, end: 5 }) }, { text: 'hello /git world', caret: 10 })
  assert.deepEqual({ ...buildInsertedDraft('hello', 'git', { start: 0, end: 0 }) }, { text: '/git hello', caret: 5 })
  assert.deepEqual({ ...buildInsertedDraft('a\nb', 'git', { start: 2, end: 2 }) }, { text: 'a\n/git b', caret: 7 })
})

test('client bundle: buildInsertedDraft replaces the selected range', () => {
  const { buildInsertedDraft } = loadClientBundle()
  assert.deepEqual({ ...buildInsertedDraft('hello world', 'git', { start: 6, end: 11 }) }, { text: 'hello /git ', caret: 11 })
})

test('client bundle: installed-open preference helpers persist collapse state', () => {
  const calls = []
  const ls = {
    getItem: (k) => (k === 'dsh-any-skills:installed-open' ? '0' : null),
    setItem: (k, v) => calls.push([k, v]),
  }
  const { loadInstalledOpen, saveInstalledOpen } = loadClientBundle({ localStorage: ls })
  assert.equal(loadInstalledOpen(), false, "'0' means collapsed")
  saveInstalledOpen(true)
  assert.deepEqual(calls[0], ['dsh-any-skills:installed-open', '1'])
  saveInstalledOpen(false)
  assert.deepEqual(calls[1], ['dsh-any-skills:installed-open', '0'])

  const { loadInstalledOpen: loadDefault } = loadClientBundle({ localStorage: { getItem: () => null } })
  assert.equal(loadDefault(), true, 'no stored value means expanded by default')
})

/** 深度优先查找 vdom 树中满足条件的节点（createElementStub 产物）。 */
function findBy(node, predicate) {
  if (node === null || node === undefined) return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findBy(child, predicate)
      if (found !== null) return found
    }
    return null
  }
  if (typeof node !== 'object') return null
  if (predicate(node)) return node
  return findBy(node.children, predicate)
}

/** 收集 vdom 树中所有满足条件的节点。 */
function findAll(node, predicate, out = []) {
  if (node === null || node === undefined) return out
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out)
    return out
  }
  if (typeof node !== 'object') return out
  if (predicate(node)) out.push(node)
  findAll(node.children, predicate, out)
  return out
}

test('client bundle: import-open preference helpers persist collapse state', () => {
  const calls = []
  const ls = {
    getItem: (k) => (k === 'dsh-any-skills:import-open' ? '0' : null),
    setItem: (k, v) => calls.push([k, v]),
  }
  const { loadImportOpen, saveImportOpen } = loadClientBundle({ localStorage: ls })
  assert.equal(loadImportOpen(), false, "'0' means collapsed")
  saveImportOpen(true)
  assert.deepEqual(calls[0], ['dsh-any-skills:import-open', '1'])
  saveImportOpen(false)
  assert.deepEqual(calls[1], ['dsh-any-skills:import-open', '0'])

  const { loadImportOpen: loadDefault } = loadClientBundle({ localStorage: { getItem: () => null } })
  assert.equal(loadDefault(), true, 'no stored value means expanded by default')
})

test('client bundle: filterSkills filters installed skills by name and description', () => {
  const { filterSkills } = loadClientBundle()
  const skills = [
    { name: 'docx', description: 'Word documents', descriptionZh: 'Word 文档' },
    { name: 'pdf', description: 'PDF handling', descriptionZh: 'PDF 处理' },
    { name: 'pdf-tools', description: 'PDF 高级工具', descriptionZh: 'PDF 高级工具' },
  ]
  assert.equal(filterSkills(skills, '').length, 3, 'empty query keeps all')
  assert.deepEqual(filterSkills(skills, 'doc').map((s) => s.name), ['docx'])
  assert.deepEqual(filterSkills(skills, 'PDF').map((s) => s.name), ['pdf', 'pdf-tools'], 'matches description (case-insensitive)')
  assert.deepEqual(filterSkills(skills, '处理').map((s) => s.name), ['pdf'], 'matches zh description')
  assert.deepEqual(filterSkills(skills, 'nope'), [], 'no match → empty')
  assert.deepEqual(filterSkills(skills, '  pdf  ').map((s) => s.name), ['pdf', 'pdf-tools'], 'trims whitespace')
})

test('client bundle: settings section renders installed + import collapse headers', () => {
  const { apply } = loadClientBundle({ localStorage: { getItem: () => '1', setItem: () => undefined } })
  const registrations = []
  const ctx = {
    slots: {
      inject(key, callback) {
        registrations.push({ key, callback })
        return () => undefined
      },
      register(opts, component) {
        return { opts, component }
      },
    },
    effect(callback) {
      return callback() ?? (() => undefined)
    },
  }
  apply(ctx)
  const settings = registrations.find((r) => r.key === 'settings.section').callback()
  const tree = settings.component({})
  const headers = findAll(tree, (n) => n && typeof n === 'object' && n.props !== null && n.props['aria-expanded'] !== undefined)
  assert.ok(headers.length >= 2, `expected >=2 collapse headers, got ${headers.length}`)
  for (const header of headers) {
    assert.equal(header.props.role, 'button')
    assert.equal(header.props['aria-expanded'], true, 'expanded by stored preference')
  }
})

test('client bundle: pickLocalized selects the locale-matching field with fallback', () => {
  const { pickLocalized } = loadClientBundle()
  assert.equal(pickLocalized('zh', '中文说明', 'English desc', 'Fallback'), '中文说明')
  assert.equal(pickLocalized('en', '中文说明', 'English desc', 'Fallback'), 'English desc')
  assert.equal(pickLocalized('zh', undefined, 'English desc', 'Fallback'), 'Fallback', 'zh missing → fallback')
  assert.equal(pickLocalized('en', '中文说明', undefined, 'Fallback'), 'Fallback', 'en missing → fallback')
  assert.equal(pickLocalized('zh', undefined, undefined, 'Fallback'), 'Fallback')
  assert.equal(pickLocalized('fr', '中文说明', 'English desc', 'Fallback'), 'English desc', 'unknown locale → en branch')
})

test('client bundle: currentLocale reads the document language', () => {
  const zh = loadClientBundle({
    document: { documentElement: { lang: 'zh-CN' } },
  })
  assert.equal(zh.currentLocale(), 'zh')

  const en = loadClientBundle({
    document: { documentElement: { lang: 'en' } },
  })
  assert.equal(en.currentLocale(), 'en')

  const none = loadClientBundle()
  assert.equal(none.currentLocale(), 'en', 'no document → en default')
})

test('client bundle: UI text dictionary covers both locales', () => {
  const { uiText } = loadClientBundle()
  const zh = uiText('zh')
  const en = uiText('en')
  assert.equal(zh.usage, '用法')
  assert.equal(en.usage, 'Usage')
  assert.equal(zh.installed, '已安装技能')
  assert.equal(en.installed, 'Installed Skills')
  assert.ok(typeof zh.installDirLabel === 'string' && zh.installDirLabel.length > 0)
  assert.ok(typeof en.installDirLabel === 'string' && en.installDirLabel.length > 0)
})

test('client bundle: CSS uses official theme tokens only (light/dark adaptive)', () => {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  for (const banned of [
    '--dsw-alias-interactive-bg-hover',
    '--dsw-alias-label-tertiary',
    '--dsw-alias-label-primary-bluish',
    '--dsw-alias-danger',
    '--dsw-specific-tip',
    '#1e2533',
    '#e6ebf2',
  ]) {
    assert.ok(!source.includes(banned), `CSS must not use ${banned}`)
  }
  for (const official of [
    '--dsw-alias-bg-overlay',
    '--dsw-alias-state-error-primary',
    '--dsw-alias-state-success-primary',
    '--dsw-alias-state-warn-primary',
    '--dsw-alias-brand-primary',
    '--dsw-alias-label-secondary',
  ]) {
    assert.ok(source.includes(official), `CSS must use ${official}`)
  }
})

test('client bundle: apply tolerates missing slots', () => {
  const { apply } = loadClientBundle()
  assert.doesNotThrow(() => apply({ slots: undefined, get: () => undefined }))
})
