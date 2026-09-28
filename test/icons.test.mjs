/**
 * dsh-any-skills — 图标规格守卫测试。
 *
 * 对齐 DSH 应用自带的图标体系（@deepseek-ai/dsh-client-ui-primitives）：
 *   viewBox 0 0 16 16 · fill none · stroke currentColor · 线宽 1.2-1.8（主流 1.5）
 *   · 圆线帽/圆角连接 · 渲染尺寸 16（输入框按钮）/ 14（行内）
 * 24 网格 + 线宽 2 的旧实现，在 16px 下有效线宽仅 1.33px（半像素、发虚）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function createElementStub(type, props, ...children) {
  return { type, props: props ?? null, children: children.length === 1 ? children[0] : children }
}

function loadClientBundle(extraSandbox = {}) {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  let captured = null
  const sandbox = {
    window: { __ModuleLoader__: { load(definition) { captured = definition } } },
    console,
    ...extraSandbox,
  }
  sandbox.window.window = sandbox.window
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox)
  assert.ok(captured, 'client bundle must register via __ModuleLoader__.load')
  return captured.factory((specifier) => {
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
}

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

/** createElement 桩不会执行函数组件，这里递归展开以便断言其产出的 svg。 */
function expand(node) {
  if (Array.isArray(node)) return node.flatMap(expand)
  if (node === null || node === undefined || typeof node !== 'object') return [node]
  if (typeof node.type === 'function') {
    const props = node.children !== undefined ? { ...(node.props ?? {}), children: node.children } : (node.props ?? {})
    return expand(node.type(props))
  }
  return [{ ...node, children: node.children === undefined ? undefined : expand(node.children) }]
}

function renderComposerPicker() {
  const { apply } = loadClientBundle()
  const registrations = []
  apply({
    slots: {
      inject(key, callback) { registrations.push({ key, callback }); return () => undefined },
      register(opts, component) { return { opts, component } },
    },
    effect: (callback) => callback() ?? (() => undefined),
  })
  const composer = registrations.find((r) => r.key === 'conversation.input.right').callback()
  return composer.component({ input: { draft: '' }, inputActions: { setDraft: () => undefined } })
}

test('icons: composer picker uses the ⚡ glyph (plugin-wide symbol)', () => {
  const tree = expand(renderComposerPicker())
  const glyphs = findAll(tree, (n) => n && typeof n === 'object' && n.props !== null && typeof n.props.className === 'string' && n.props.className.startsWith('dsh-as-bolt'))
  assert.equal(glyphs.length, 1, 'composer button renders the ⚡ glyph')
  const glyphText = Array.isArray(glyphs[0].children) ? glyphs[0].children.join('') : glyphs[0].children
  assert.equal(glyphText, '⚡', 'renders the emoji character, not a hand-drawn path')
  assert.equal(glyphs[0].props['aria-hidden'], true, 'decorative: label comes from the button')
  assert.equal(glyphs[0].props.style.fontSize, '16px', '16px inside the 28px button')
})

test('icons: bundle contains no 24-grid icons anymore (grid unified)', () => {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.ok(!source.includes('0 0 24 24'), 'no 24-grid icon left in the bundle')
  assert.ok(source.includes('0 0 16 16'), '16-grid icons are used')
})

test('icons: inline icons render at 14px (app row convention), not 12px', () => {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.ok(!source.includes('size: 12'), 'no 12px inline icon size left')
})
