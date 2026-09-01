/**
 * dsh-any-skills — browser half.
 *
 * Two Slot contributions:
 *
 *  1. `conversation.input.right` — a button beside the composer (before the
 *     send button). Clicking it opens a searchable popover of every installed
 *     skill (fetched from the host route /api/skills/list); picking one
 *     inserts the native `/skill-name` gesture into the draft **at the current
 *     caret position** (falling back to the end when the caret is unknown)
 *     via `inputActions.setDraft`, so the skill loads with the message.
 *
 *  2. `settings.section` — a "Skill 管理" settings page: installed list with
 *     uninstall, import from Codex / Claude Code / OpenCode and local
 *     directories, and batch install from GitHub / npm.
 *
 * All data crosses the wire as plain JSON; no live objects are serialized.
 * DOM/style wiring failures are logged, never thrown.
 */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react'

export const inject = ['slots']

const NS = 'dsh-any-skills'
const API = '/api/skills'
const USAGE_KEY = 'dsh-any-skills:usage'

/* ---------------- tiny API client ---------------- */

interface SkillView {
  name: string
  description: string
  /** 可选多语言说明（SKILL.md frontmatter description_zh / description_en）。 */
  descriptionZh?: string
  descriptionEn?: string
  /** 可选"何时使用"说明（whenToUse / whenToUse_zh / whenToUse_en）。 */
  whenToUse?: string
  whenToUseZh?: string
  whenToUseEn?: string
  path: string
  kind: 'bundle' | 'flat'
  installed?: boolean
}

/* ---------------- locale & localized text ---------------- */

export type Locale = 'zh' | 'en'

/** 读取当前应用语言：dsh 把语言同步到 document.documentElement.lang（zh-CN / en）。 */
export function currentLocale(): Locale {
  try {
    const lang = String(document.documentElement.lang ?? '').toLowerCase()
    return lang.startsWith('zh') ? 'zh' : 'en'
  } catch {
    return 'en'
  }
}

/**
 * 按语言取字段：zh 优先 zh 值，否则（含未知语言）取 en 值，都没有则用 fallback。
 */
export function pickLocalized<T>(locale: Locale, zh: T | undefined, en: T | undefined, fallback: T): T {
  if (locale === 'zh') return zh ?? fallback
  return en ?? fallback
}

interface FilterableSkill {
  name: string
  description?: string
  descriptionZh?: string
  descriptionEn?: string
}

/**
 * 按技能名 + 说明（含中英文）模糊过滤，大小写不敏感；空查询返回原列表。
 */
export function filterSkills<T extends FilterableSkill>(skills: T[], query: string): T[] {
  const q = query.trim().toLowerCase()
  if (q === '') return skills
  return skills.filter((s) =>
    s.name.toLowerCase().includes(q)
    || String(s.description ?? '').toLowerCase().includes(q)
    || String(s.descriptionZh ?? '').toLowerCase().includes(q)
    || String(s.descriptionEn ?? '').toLowerCase().includes(q),
  )
}

interface UiText {
  usage: string
  installed: string
  installDirLabel: string
  loading: string
  noSkills: string
  uninstall: string
  noDescription: string
  pickerTitle: string
  pickerAria: string
  searchPlaceholder: string
  refresh: string
  refreshAria: string
  loadingSkills: string
  noSkillsInstalled: string
  noMatch: string
  loadFailed: string
  expandInstalled: string
  collapseInstalled: string
  expandImport: string
  collapseImport: string
  srcCwdLabel: string
  pageTitle: string
  pageSub: string
  toggleLabel: string
  toggleSub: string
  importTitle: string
  importSub: string
  installTitle: string
  installSub: string
  importPlaceholder: string
  installPlaceholder: string
  importAll: string
  importOne: string
  installedTag: string
  importing: string
  countSuffix: string
  installBtn: string
  refreshBtn: string
  scanningSources: string
  groupNoSkills: string
  dirTip: string
  importBtn: string
  localDirAria: string
  installInputAria: string
  restore: string
  closeNotice: string
  restoreHint: string
  pickerOnNotice: string
  pickerOffNotice: string
  importedNotice: string
  skippedSuffix: string
  installedNotice: string
  installDoneNotice: string
  installFailedNotice: string
  localPathRequired: string
  remoteInputRequired: string
}

const ZH_TEXT: UiText = {
  usage: '用法',
  installed: '已安装技能',
  installDirLabel: '安装目录',
  loading: '正在读取…',
  noSkills: '还没有安装任何技能。',
  uninstall: '卸载',
  noDescription: '(无描述)',
  pickerTitle: '选择技能（插入 /技能名 到发送框）',
  pickerAria: '选择技能',
  searchPlaceholder: '搜索技能…',
  refresh: '刷新技能列表',
  refreshAria: '刷新技能列表',
  loadingSkills: '加载中…',
  noSkillsInstalled: '还没有安装技能。到 设置 → Skill 管理 导入。',
  noMatch: '没有匹配的技能',
  loadFailed: '加载失败',
  expandInstalled: '点击展开已安装技能列表',
  collapseInstalled: '点击折叠已安装技能列表',
  expandImport: '点击展开「导入」区域',
  collapseImport: '点击折叠「导入」区域',
  srcCwdLabel: '项目级目录基于服务启动目录检测：',
  pageTitle: 'Skill 管理',
  pageSub: '技能存放于 ~/.dsh/skills，模型可自动读取；在对话框旁点击 ⚡ 按钮可插入 /技能名 调用。',
  toggleLabel: '在对话输入框旁显示 ⚡ 技能选择按钮',
  toggleSub: '关闭后仍可在输入框直接输入 /技能名 调用',
  importTitle: '导入',
  importSub: '从 Codex / Claude Code / OpenCode 或本机目录复制技能到 ~/.dsh/skills。',
  installTitle: '安装',
  installSub: '从 GitHub 或 npm 安装（支持批量，用空格/逗号/分号分隔）。',
  importPlaceholder: '本机目录路径（含 SKILL.md 或技能文件）',
  installPlaceholder: 'owner/repo 或 https://github.com/... 或 npm 包名，多个用空格分隔',
  importAll: '导入全部',
  importOne: '仅导入',
  installedTag: '已安装',
  importing: '安装中…',
  countSuffix: ' 个技能',
  installBtn: '安装',
  refreshBtn: '刷新',
  scanningSources: '正在扫描来源…',
  groupNoSkills: '该目录下没有技能',
  dirTip: '点击展开查看技能详情',
  importBtn: '导入',
  localDirAria: '本机目录路径',
  installInputAria: 'GitHub 仓库或 npm 包名',
  restore: '恢复',
  closeNotice: '关闭提示',
  restoreHint: '手动恢复：将回收目录移回安装目录（在终端执行 {cmd}），或直接点击「恢复」按钮。',
  pickerOnNotice: '已开启 ⚡ 技能选择按钮（对话框旁）',
  pickerOffNotice: '已关闭 ⚡ 技能选择按钮；仍可在输入框输入 /技能名 调用技能',
  importedNotice: '已导入 {n} 个技能',
  skippedSuffix: '（{n} 个已存在，跳过）',
  installedNotice: '已安装 {n} 个技能（{ok}/{total} 个来源成功）',
  installDoneNotice: '安装完成',
  installFailedNotice: '安装失败：{n} 个来源（详见下方错误）',
  localPathRequired: '请输入本机目录路径',
  remoteInputRequired: '请输入 GitHub 仓库（owner/repo 或 URL）或 npm 包名',
}

const EN_TEXT: UiText = {
  usage: 'Usage',
  installed: 'Installed Skills',
  installDirLabel: 'Install directory',
  loading: 'Loading…',
  noSkills: 'No skills installed yet.',
  uninstall: 'Uninstall',
  noDescription: '(no description)',
  pickerTitle: 'Pick a skill (inserts /skill-name into the input)',
  pickerAria: 'Pick a skill',
  searchPlaceholder: 'Search skills…',
  refresh: 'Refresh skill list',
  refreshAria: 'Refresh skill list',
  loadingSkills: 'Loading…',
  noSkillsInstalled: 'No skills installed yet. Import from Settings → Skill Manager.',
  noMatch: 'No matching skills',
  loadFailed: 'Failed to load',
  expandInstalled: 'Click to expand the installed skills list',
  collapseInstalled: 'Click to collapse the installed skills list',
  expandImport: 'Click to expand the import area',
  collapseImport: 'Click to collapse the import area',
  srcCwdLabel: 'Project directories are detected from the server start directory: ',
  pageTitle: 'Skill Manager',
  pageSub: 'Skills live in ~/.dsh/skills and are read automatically by the model; click the ⚡ button beside the input to insert /skill-name.',
  toggleLabel: 'Show the ⚡ skill picker beside the input',
  toggleSub: 'When off, type /skill-name directly in the input',
  importTitle: 'Import',
  importSub: 'Copy skills from Codex / Claude Code / OpenCode or a local directory into ~/.dsh/skills.',
  installTitle: 'Install',
  installSub: 'Install from GitHub or npm (batch: space/comma/semicolon separated).',
  importPlaceholder: 'Local directory path (contains SKILL.md or skill files)',
  installPlaceholder: 'owner/repo or https://github.com/... or npm package, space-separated',
  importAll: 'Import all',
  importOne: 'Import only',
  installedTag: 'Installed',
  importing: 'Installing…',
  countSuffix: ' skills',
  installBtn: 'Install',
  refreshBtn: 'Refresh',
  scanningSources: 'Scanning sources…',
  groupNoSkills: 'No skills in this directory',
  dirTip: 'Click to expand skill details',
  importBtn: 'Import',
  localDirAria: 'Local directory path',
  installInputAria: 'GitHub repo or npm package',
  restore: 'Restore',
  closeNotice: 'Dismiss',
  restoreHint: 'Restore manually: move the trash directory back into the install directory (in a terminal: {cmd}), or click "Restore".',
  pickerOnNotice: '⚡ skill picker enabled (beside the input)',
  pickerOffNotice: '⚡ skill picker disabled; type /skill-name in the input to invoke skills',
  importedNotice: 'Imported {n} skills',
  skippedSuffix: ' ({n} already exist, skipped)',
  installedNotice: 'Installed {n} skills ({ok}/{total} sources OK)',
  installDoneNotice: 'Install finished',
  installFailedNotice: 'Install failed: {n} source(s) (see error below)',
  localPathRequired: 'Enter a local directory path',
  remoteInputRequired: 'Enter a GitHub repo (owner/repo or URL) or an npm package name',
}

export function uiText(locale: Locale): UiText {
  return locale === 'zh' ? ZH_TEXT : EN_TEXT
}

interface SourceGroup {
  id: string
  label: string
  tool: 'codex' | 'claude' | 'opencode'
  path: string
  exists: boolean
  skills: SkillView[]
}

export interface InstallResult {
  source: string
  ok: boolean
  installed?: SkillView[]
  branch?: string
  message?: string
}

/**
 * 生成安装结果提示：全部来源失败时必须是失败提示（不能是「安装完成」），
 * 否则显示已安装数量/成功来源数。
 */
export function installNoticeText(results: InstallResult[], t: UiText): { notice: string; ok: boolean } {
  const okCount = results.filter((r) => r.ok).length
  const failedCount = results.length - okCount
  if (okCount === 0 && failedCount > 0) {
    return { notice: t.installFailedNotice.replace('{n}', String(failedCount)), ok: false }
  }
  const totalInstalled = results.reduce((n, r) => n + (r.installed?.length ?? 0), 0)
  return {
    notice: okCount > 0
      ? t.installedNotice
          .replace('{n}', String(totalInstalled))
          .replace('{ok}', String(okCount))
          .replace('{total}', String(results.length))
      : t.installDoneNotice,
    ok: true,
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
  if (!res.ok || data === null || data.ok !== true) {
    const message = data && typeof data.message === 'string' ? data.message : `HTTP ${res.status}`
    throw new Error(message)
  }
  return data as T
}

const apiList = () => api<{ installDir: string; skills: SkillView[] }>(`${API}/list`)
const apiSources = (cwd: string) => api<{ cwd: string; sources: SourceGroup[] }>(`${API}/sources?cwd=${encodeURIComponent(cwd)}`)
const apiImport = (body: Record<string, unknown>) => api<{ imported: SkillView[]; skipped?: string[] }>(`${API}/import`, { method: 'POST', body: JSON.stringify(body) })
const apiInstall = (sources: Array<{ type: string; value: string }>) => api<{ results: InstallResult[] }>(`${API}/install`, { method: 'POST', body: JSON.stringify({ sources }) })
const apiUninstall = (name: string) => api<{ message: string; trash?: string }>(`${API}/uninstall`, { method: 'DELETE', body: JSON.stringify({ name }) })
const apiRestore = (name: string, trash: string) => api<{ message: string }>(`${API}/restore`, { method: 'POST', body: JSON.stringify({ name, trash }) })

/* ---------------- styles ---------------- */

const STYLE_ID = 'dsh-any-skills-style'
// 全部使用 DSH 官方主题令牌（--dsw-alias-*，明暗主题自动翻转）；
// 交互底色由 label-primary 派生（color-mix），不再依赖非官方令牌或写死的暗色兜底色。
const CSS = [
  '.dsh-as-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;margin:0 2px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.28));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 6%,transparent);color:var(--dsw-alias-label-secondary,#8a94a6);cursor:pointer;padding:0;transition:background-color .18s ease,color .18s ease,border-color .18s ease}',
  '.dsh-as-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 14%,transparent);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1,rgba(128,128,128,.4))}',
  '.dsh-as-btn:disabled{opacity:.45;cursor:not-allowed}',
  '.dsh-as-btn.dsh-as-open{color:var(--dsw-alias-brand-primary,#4f8cff);border-color:var(--dsw-alias-brand-primary,#4f8cff);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f8cff) 12%,transparent)}',
  '.dsh-as-pop{position:absolute;bottom:calc(100% + 8px);right:0;width:340px;max-height:340px;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.35);overflow:hidden;z-index:1000}',
  '.dsh-as-search{box-sizing:border-box;width:calc(100% - 16px);margin:8px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 10%,transparent);color:var(--dsw-alias-label-primary);font-size:13px;outline:none;flex:none}',
  '.dsh-as-list{overflow-y:auto;flex:auto;padding:0 6px 8px}',
  '.dsh-as-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;padding:7px 10px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left}',
  '.dsh-as-item:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent)}',
  '.dsh-as-name{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;font-weight:500}',
  '.dsh-as-desc{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}',
  '.dsh-as-status{padding:12px;color:var(--dsw-alias-label-secondary,#8a94a6);font-size:13px}',
  '.dsh-as-page{display:grid;gap:18px;width:100%;min-width:0;max-width:780px;padding:6px 0 36px;font-size:14px;line-height:1.55;color:var(--dsw-alias-label-primary)}',
  '.dsh-as-card{display:grid;gap:10px;padding:16px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.22));border-radius:12px;background:var(--dsw-alias-bg-layer-1,transparent)}',
  '.dsh-as-card h3{margin:0;font-size:15px;font-weight:600}',
  '.dsh-as-sub{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12.5px;margin:-4px 0 2px}',
  '.dsh-as-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.16));border-radius:10px;min-width:0}',
  '.dsh-as-row-main{flex:1;min-width:0}',
  '.dsh-as-count{display:inline-flex;align-items:center;margin-left:8px;padding:0 8px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent);color:var(--dsw-alias-label-secondary,#8a94a6);font-size:11.5px;font-weight:600;vertical-align:2px}',
  '.dsh-as-caret{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12px;flex:none}',
  '.dsh-as-card-row{display:grid;gap:0;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.16));border-radius:10px;overflow:hidden}',
  '.dsh-as-card-row .dsh-as-row{border:none;border-radius:0}',
  '.dsh-as-card-row.dsh-as-row-open .dsh-as-row{background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 6%,transparent)}',
  '.dsh-as-skill-list{display:grid;gap:6px;padding:8px 10px 10px;border-top:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.12))}',
  '.dsh-as-skill-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.12));border-radius:8px;min-width:0}',
  '.dsh-as-installed{color:var(--dsw-alias-state-success-primary,#7bdca8);font-size:12px;font-weight:500}',
  '.dsh-as-code{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent);padding:1px 5px;border-radius:4px;word-break:break-all}',
  '.dsh-as-toggle{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary);user-select:none}',
  '.dsh-as-switch{position:relative;width:36px;height:20px;flex:none;appearance:none;-webkit-appearance:none;margin:0;background:color-mix(in srgb,var(--dsw-alias-label-secondary,#8a94a6) 32%,transparent);border-radius:999px;cursor:pointer;transition:background .15s ease;outline:none}',
  '.dsh-as-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s ease}',
  '.dsh-as-switch:checked{background:var(--dsw-alias-brand-primary,#4f8cff)}',
  '.dsh-as-switch:checked::after{transform:translateX(16px)}',
  '.dsh-as-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4f8cff);outline-offset:2px}',
  '.dsh-as-row-name{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dsh-as-row-desc{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.dsh-as-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
  '.dsh-as-input{flex:1;min-width:180px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:inherit;border-radius:8px;padding:7px 11px;font-size:13px;outline:none}',
  '.dsh-as-input:focus{border-color:var(--dsw-alias-brand-primary,#4f8cff)}',
  '.dsh-as-btn2{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.24));background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 5%,transparent);color:var(--dsw-alias-label-primary);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background-color .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease}',
  '.dsh-as-btn2:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1,rgba(128,128,128,.45))}',
  '.dsh-as-btn2:active:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 18%,transparent)}',
  '.dsh-as-btn2:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4f8cff);outline-offset:2px}',
  '.dsh-as-btn2:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}',
  '.dsh-as-btn2.dsh-as-primary{background:var(--dsw-alias-brand-primary,#4f8cff);border-color:transparent;color:var(--dsw-alias-bg-base,#fff);box-shadow:0 1px 2px rgba(0,0,0,.2)}',
  '.dsh-as-btn2.dsh-as-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f8cff) 88%,#000);color:var(--dsw-alias-bg-base,#fff);border-color:transparent;box-shadow:0 1px 3px rgba(0,0,0,.28)}',
  '.dsh-as-btn2.dsh-as-primary:active:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f8cff) 78%,#000)}',
  '.dsh-as-btn2.dsh-as-danger{color:var(--dsw-alias-state-error-primary,#e05c5c);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05c5c) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05c5c) 5%,transparent)}',
  '.dsh-as-btn2.dsh-as-danger:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#e05c5c);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05c5c) 12%,transparent);border-color:var(--dsw-alias-state-error-primary,#e05c5c)}',
  '.dsh-as-err{display:flex;gap:8px;align-items:center;padding:9px 12px;border-radius:8px;font-size:12.5px;color:var(--dsw-alias-state-warn-primary,#e0a13c);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a13c) 8%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a13c) 30%,transparent)}',
  '.dsh-as-ok{display:flex;gap:8px;align-items:center;padding:9px 12px;border-radius:8px;font-size:12.5px;color:var(--dsw-alias-state-success-primary,#7bdca8);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#7bdca8) 8%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary,#7bdca8) 28%,transparent)}',
  '.dsh-as-spin{animation:dsh-as-spin .9s linear infinite}',
  '@keyframes dsh-as-spin{to{transform:rotate(360deg)}}',
].join('\n')

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.setAttribute('data-plugin', NS)
  style.textContent = CSS
  document.head.appendChild(style)
}

/* ---------------- icons (inline SVG) ---------------- */

function IconBolt(props: { size?: number; spin?: boolean }): ReturnType<typeof h> {
  return h('svg', {
    width: props.size ?? 16,
    height: props.size ?? 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: props.spin === true ? 'dsh-as-spin' : undefined,
    'aria-hidden': true,
    style: { flex: '0 0 auto' },
  },
  h('path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' }))
}

function IconTrash(): ReturnType<typeof h> {
  return h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, style: { flex: '0 0 auto' } },
    h('path', { d: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z' }))
}

function IconRefresh(props: { size?: number; spin?: boolean }): ReturnType<typeof h> {
  return h('svg', {
    width: props.size ?? 14,
    height: props.size ?? 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    className: props.spin === true ? 'dsh-as-spin' : undefined,
    style: { flex: '0 0 auto' },
  },
  h('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6' }))
}

/* ---------------- usage ordering (localStorage) ---------------- */

interface UsageEntry { count: number; lastUsed: number }

function loadUsage(): Record<string, UsageEntry> {
  try {
    const raw = localStorage.getItem(USAGE_KEY)
    if (raw === null) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed !== null && typeof parsed === 'object' ? parsed as Record<string, UsageEntry> : {}
  } catch {
    return {}
  }
}

function saveUsage(usage: Record<string, UsageEntry>): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
  } catch {
    /* storage unavailable */
  }
}

/* ---------------- installed-list collapse preference ---------------- */
/* 设置页「已安装技能」列表可折叠，状态持久化到 localStorage（默认展开）。 */

const INSTALLED_OPEN_KEY = 'dsh-any-skills:installed-open'

export function loadInstalledOpen(): boolean {
  try {
    return localStorage.getItem(INSTALLED_OPEN_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveInstalledOpen(open: boolean): void {
  try {
    localStorage.setItem(INSTALLED_OPEN_KEY, open ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}

/* ---------------- import-section collapse preference ---------------- */
/* 设置页「导入」区域可折叠，状态持久化到 localStorage（默认展开）。 */

const IMPORT_OPEN_KEY = 'dsh-any-skills:import-open'

export function loadImportOpen(): boolean {
  try {
    return localStorage.getItem(IMPORT_OPEN_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveImportOpen(open: boolean): void {
  try {
    localStorage.setItem(IMPORT_OPEN_KEY, open ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}

/* ---------------- picker visibility preference ---------------- */
/* The composer ⚡ button can be hidden from the settings page. The
 * preference lives in localStorage (per browser) and is pushed to the
 * live picker through a tiny subscription, so toggling it in settings
 * updates the composer without a reload. Default: visible. */

const SHOW_PICKER_KEY = 'dsh-any-skills:show-picker'
const pickerListeners = new Set<() => void>()

function isPickerEnabled(): boolean {
  try {
    return localStorage.getItem(SHOW_PICKER_KEY) !== '0'
  } catch {
    return true
  }
}

function applyPickerEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SHOW_PICKER_KEY, enabled ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
  pickerListeners.forEach((listener) => listener())
}

function subscribePickerEnabled(listener: () => void): () => void {
  pickerListeners.add(listener)
  return () => {
    pickerListeners.delete(listener)
  }
}

function rankByUsage(skills: SkillView[], usage: Record<string, UsageEntry>): SkillView[] {
  return skills.slice().sort((a, b) => {
    const ua = usage[a.name]
    const ub = usage[b.name]
    const la = ua?.lastUsed ?? 0
    const lb = ub?.lastUsed ?? 0
    if (la !== lb) return lb - la
    const ca = ua?.count ?? 0
    const cb = ub?.count ?? 0
    if (ca !== cb) return cb - ca
    return a.name.localeCompare(b.name)
  })
}

/* ---------------- composer picker button ---------------- */

/** 光标/选区范围（相对于 draft 字符串的 UTF-16 码元偏移）。 */
export interface DraftRange {
  start: number
  end: number
}

export interface InsertDraftResult {
  /** 写入发送框的完整新 draft。 */
  text: string
  /** 插入完成后光标应停留的位置（text 内的偏移）。 */
  caret: number
}

/**
 * 把 `/name ` 命令插入 draft：
 *  - 无 range（或 start < 0）：追加到末尾（保持旧行为）；
 *  - 有 range：在 start 处插入并替换 [start, end) 选区，光标落到命令之后；
 *  - 分隔：仅在需要处补一个空格，命令后跟一个空格（suffix 以空格开头则不重复）。
 */
export function buildInsertedDraft(draft: string, name: string, range?: DraftRange): InsertDraftResult {
  if (range === undefined || range.start < 0) {
    const sep = draft === '' || draft.endsWith(' ') || draft.endsWith('\n') ? '' : ' '
    const text = `${draft}${sep}/${name} `
    return { text, caret: text.length }
  }
  const start = Math.min(range.start, draft.length)
  const end = range.end > start ? Math.min(range.end, draft.length) : start
  const prefix = draft.slice(0, start)
  const suffix = draft.slice(end)
  const sepBefore = prefix === '' || prefix.endsWith(' ') || prefix.endsWith('\n') ? '' : ' '
  const sepAfter = suffix === '' ? ' ' : suffix.startsWith(' ') || suffix.startsWith('\n') ? '' : ' '
  const text = `${prefix}${sepBefore}/${name}${sepAfter}${suffix}`
  const caret = start + sepBefore.length + 1 + name.length + sepAfter.length
  return { text, caret }
}

/**
 * 从 picker 按钮向上查找 composer 的 textarea：
 * 按钮与输入卡片是兄弟关系，需逐级上升，直到某个祖先包含
 * `[data-composer-card]`，再取其中唯一的 textarea。
 */
function findComposerTextarea(box: HTMLElement | null): HTMLTextAreaElement | null {
  let el: HTMLElement | null = box
  while (el !== null) {
    try {
      const card = el.querySelector('[data-composer-card]')
      if (card !== null) {
        const ta = card.querySelector('textarea')
        return ta instanceof HTMLTextAreaElement ? ta : null
      }
    } catch {
      return null
    }
    el = el.parentElement
  }
  return null
}

interface PickerProps {
  session?: { sessionId?: string }
  input?: { draft?: string }
  inputActions?: { setDraft?: (draft: string) => void }
  useInput?: (selector: (state: unknown) => unknown) => unknown
}

function SkillPickerButton(props: PickerProps): ReturnType<typeof h> | null {
  const [enabled, setEnabled] = useState<boolean>(() => isPickerEnabled())
  useEffect(() => subscribePickerEnabled(() => setEnabled(isPickerEnabled())), [])
  const [open, setOpen] = useState(false)
  const [skills, setSkills] = useState<SkillView[] | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [usage, setUsage] = useState<Record<string, UsageEntry>>(() => loadUsage())
  const boxRef = useRef<HTMLDivElement | null>(null)
  /** 用户是否曾聚焦过 composer textarea：从未聚焦时 selectionStart 恒为 0，应回退为追加到末尾 */
  const taEverFocusedRef = useRef(false)

  // 跟踪 composer textarea 的聚焦状态（失焦后 selectionStart 仍保留，随时可读光标）
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      try {
        if (
          event.target instanceof HTMLTextAreaElement &&
          event.target === findComposerTextarea(boxRef.current)
        ) {
          taEverFocusedRef.current = true
        }
      } catch {
        /* ignore */
      }
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  const load = useCallback(async (force = false) => {
    if (!force && (skills !== undefined || error !== undefined)) return
    if (force) {
      setSkills(undefined)
      setError(undefined)
    }
    try {
      const data = await apiList()
      setSkills(data.skills ?? [])
    } catch (cause) {
      setError(messageOf(cause))
    }
  }, [skills, error])

  const toggle = () => {
    if (!open) void load(true) // 每次打开都重新拉取，导入新技能后立即可见
    setOpen((value) => !value)
  }

  const pick = (name: string) => {
    let draft = ''
    if (props.input !== undefined && typeof props.input.draft === 'string') {
      draft = props.input.draft
    } else if (typeof props.useInput === 'function') {
      try {
        const state = props.useInput((s) => s) as { draft?: unknown } | undefined
        if (state !== undefined && typeof state.draft === 'string') draft = state.draft
      } catch {
        /* ignore */
      }
    }

    // 光标已知（用户曾聚焦输入框、DOM 值与快照一致）时插入到光标处；否则回退为追加到末尾
    let range: DraftRange | undefined
    try {
      const ta = findComposerTextarea(boxRef.current)
      if (ta !== null && ta.value === draft && taEverFocusedRef.current) {
        const start = ta.selectionStart
        if (start >= 0) {
          const end = ta.selectionEnd > start ? ta.selectionEnd : start
          range = { start, end }
        }
      }
    } catch {
      /* ignore */
    }
    const { text, caret } = buildInsertedDraft(draft, name, range)

    try {
      if (typeof props.inputActions?.setDraft === 'function') {
        props.inputActions.setDraft(text)
      } else {
        console.warn(`[${NS}] inputActions.setDraft unavailable; draft not written:`, text)
      }
    } catch (cause) {
      console.error(`[${NS}] setDraft failed:`, cause)
    }

    // 焦点还给输入框，光标落到插入内容之后（受控组件重渲染后再设置选区）
    try {
      const ta = findComposerTextarea(boxRef.current)
      if (ta !== null && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          try {
            ta.focus()
            // 受控组件可能尚未提交新值：值一致时才设置光标，避免被 clamp
            if (ta.value === text) ta.setSelectionRange(caret, caret)
          } catch {
            /* ignore */
          }
        })
      }
    } catch {
      /* ignore */
    }

    const nextUsage = { ...usage, [name]: { count: (usage[name]?.count ?? 0) + 1, lastUsed: Date.now() } }
    setUsage(nextUsage)
    saveUsage(nextUsage)

    setOpen(false)
    setQuery('')
  }

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      if (boxRef.current !== null && event.target instanceof Node && !boxRef.current.contains(event.target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const ordered = rankByUsage(skills ?? [], usage)
  const q = query.trim().toLowerCase()
  const filtered = ordered
    .filter((skill) => q === '' || skill.name.toLowerCase().includes(q) || String(skill.description ?? '').toLowerCase().includes(q))
    .slice(0, 80)

  if (!enabled) return null // 设置页关闭了 ⚡ 按钮入口

  const locale = currentLocale()
  const t = uiText(locale)

  return h('div', { ref: boxRef, style: { position: 'relative', display: 'inline-flex', flex: 'none' } },
    h('button', {
      type: 'button',
      className: 'dsh-as-btn' + (open ? ' dsh-as-open' : ''),
      onClick: toggle,
      title: t.pickerTitle,
      'aria-label': t.pickerAria,
      'aria-expanded': open,
    }, h(IconBolt, { size: 16 })),
    open ? h('div', { className: 'dsh-as-pop', role: 'dialog', 'aria-label': t.pickerAria },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px 2px' } },
        h('input', {
          className: 'dsh-as-search',
          style: { margin: 0, flex: 1 },
          value: query,
          onChange: (event: { currentTarget: { value: string } }) => setQuery(event.currentTarget.value),
          placeholder: t.searchPlaceholder,
          autoFocus: true,
        }),
        h('button', {
          type: 'button',
          className: 'dsh-as-btn',
          onClick: () => void load(true),
          title: t.refresh,
          'aria-label': t.refreshAria,
        }, h(IconRefresh, { size: 12 })),
      ),
      error !== undefined
        ? h('div', { className: 'dsh-as-status' }, `${t.loadFailed}：${error}`)
        : skills === undefined
          ? h('div', { className: 'dsh-as-status' }, t.loadingSkills)
          : h('div', { className: 'dsh-as-list' },
            filtered.length === 0
              ? h('div', { className: 'dsh-as-status' }, skills.length === 0 ? t.noSkillsInstalled : t.noMatch)
              : filtered.map((skill) => {
                const desc = pickLocalized(locale, skill.descriptionZh, skill.descriptionEn, skill.description ?? '')
                const usage = pickLocalized(locale, skill.whenToUseZh, skill.whenToUseEn, skill.whenToUse)
                return h('button', {
                  key: skill.name,
                  type: 'button',
                  className: 'dsh-as-item',
                  onClick: () => pick(skill.name),
                },
                h('span', { className: 'dsh-as-name' }, `/${skill.name}`),
                h('span', { className: 'dsh-as-desc' }, desc),
                usage !== undefined && usage !== ''
                  ? h('span', { className: 'dsh-as-desc' }, usage)
                  : null)
              }),
          ),
    ) : null,
  )
}

/* ---------------- settings section ---------------- */

interface UninstallInfo {
  name: string
  trash: string
  message: string
}

function SkillsSettingsSection(): ReturnType<typeof h> {
  const [installed, setInstalled] = useState<SkillView[] | null>(null)
  const [installDir, setInstallDir] = useState<string | undefined>(undefined)
  const [sources, setSources] = useState<SourceGroup[] | null>(null)
  const [srcCwd, setSrcCwd] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [localPath, setLocalPath] = useState('')
  const [remoteInput, setRemoteInput] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [lastUninstall, setLastUninstall] = useState<UninstallInfo | null>(null)
  const [pickerEnabled, setPickerEnabledState] = useState<boolean>(() => isPickerEnabled())
  const [installedOpen, setInstalledOpen] = useState<boolean>(() => loadInstalledOpen())
  const [importOpen, setImportOpen] = useState<boolean>(() => loadImportOpen())
  const [installedQuery, setInstalledQuery] = useState('')
  const locale = currentLocale()
  const t = uiText(locale)
  const filteredInstalled = installed === null ? [] : filterSkills(installed, installedQuery)

  const toggleInstalled = () => {
    setInstalledOpen((open) => {
      const next = !open
      saveInstalledOpen(next)
      return next
    })
  }

  const toggleImport = () => {
    setImportOpen((open) => {
      const next = !open
      saveImportOpen(next)
      return next
    })
  }

  const togglePicker = (value: boolean) => {
    setPickerEnabledState(value)
    applyPickerEnabled(value)
    setNotice(value ? t.pickerOnNotice : t.pickerOffNotice)
  }

  const refresh = useCallback(async () => {
    setBusy(true)
    setError(undefined)
    try {
      const [list, src] = await Promise.all([apiList(), apiSources('')])
      setInstalled(list.skills)
      setInstallDir(list.installDir)
      setSources(src.sources)
      setSrcCwd(src.cwd)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    ensureStyles()
    void refresh()
  }, [refresh])

  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      await action()
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }, [])

  const uninstall = (name: string) => run(async () => {
    const result = await apiUninstall(name)
    if (result.trash !== undefined) {
      setLastUninstall({ name, trash: result.trash, message: result.message })
    } else {
      setNotice(result.message)
    }
    await refresh()
  })

  const restore = (info: UninstallInfo) => run(async () => {
    const result = await apiRestore(info.name, info.trash)
    setLastUninstall(null)
    setNotice(result.message)
    await refresh()
  })

  const importTool = (group: SourceGroup) => run(async () => {
    const result = await apiImport({ type: group.tool, sourceId: group.id })
    setNotice(t.importedNotice.replace('{n}', String(result.imported.length)) + (result.skipped !== undefined && result.skipped.length > 0 ? t.skippedSuffix.replace('{n}', String(result.skipped.length)) : ''))
    await refresh()
  })

  const importOne = (group: SourceGroup, skill: SkillView) => run(async () => {
    const result = await apiImport({ type: group.tool, sourceId: group.id, names: [skill.name] })
    setNotice(t.importedNotice.replace('{n}', String(result.imported.length)) + (result.skipped !== undefined && result.skipped.length > 0 ? t.skippedSuffix.replace('{n}', String(result.skipped.length)) : ''))
    await refresh()
  })

  const importLocal = () => run(async () => {
    if (localPath.trim() === '') {
      setError(t.localPathRequired)
      return
    }
    const result = await apiImport({ type: 'local', path: localPath.trim() })
    setNotice(t.importedNotice.replace('{n}', String(result.imported.length)))
    setLocalPath('')
    await refresh()
  })

  const installRemote = () => run(async () => {
    const parts = remoteInput.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean)
    if (parts.length === 0) {
      setError(t.remoteInputRequired)
      return
    }
    const sources = parts.map((part) => ({ type: guessSourceType(part), value: part }))
    const result = await apiInstall(sources)
    const failed = result.results.filter((r) => !r.ok)
    const text = installNoticeText(result.results, t)
    setNotice(text.notice)
    if (failed.length > 0) {
      setError(failed.map((f) => `${f.source}: ${f.message}`).join('；'))
    } else {
      setError(undefined)
    }
    setRemoteInput('')
    await refresh()
  })

  return h('div', { className: 'dsh-as-page', 'aria-busy': busy },
    h('header', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        h('h2', { style: { margin: 0, fontSize: 18, fontWeight: 600 } }, t.pageTitle),
        busy ? h(IconRefresh, { spin: true }) : null,
      ),
      h('button', { type: 'button', className: 'dsh-as-btn2', onClick: () => void refresh(), disabled: busy, title: t.refreshBtn },
        h(IconRefresh), t.refreshBtn),
    ),
    h('p', { className: 'dsh-as-sub', style: { marginTop: -6 } },
      t.pageSub),

    error !== undefined ? h('div', { className: 'dsh-as-err', role: 'alert' }, error) : null,
    notice !== undefined ? h('div', { className: 'dsh-as-ok', role: 'status' }, notice) : null,
    lastUninstall !== null
      ? h('div', { className: 'dsh-as-ok', role: 'status', style: { alignItems: 'flex-start' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 } },
          h('div', null, lastUninstall.message),
          h('div', { className: 'dsh-as-sub', style: { margin: 0 } },
            t.restoreHint.replace('{cmd}', `mv ${installDir ?? '~/.dsh/skills'}/${lastUninstall.trash} ${installDir ?? '~/.dsh/skills'}/${lastUninstall.name}`)),
        ),
        h('button', {
          type: 'button',
          className: 'dsh-as-btn2 dsh-as-primary',
          disabled: busy,
          onClick: () => void restore(lastUninstall),
          title: `${t.restore} ${lastUninstall.name}`,
        }, h(IconRefresh), t.restore),
        h('button', {
          type: 'button',
          className: 'dsh-as-btn2',
          disabled: busy,
          onClick: () => setLastUninstall(null),
          title: t.closeNotice,
          'aria-label': t.closeNotice,
        }, '×'),
      )
      : null,

    h('section', { className: 'dsh-as-card' },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
        h('label', { className: 'dsh-as-toggle' },
          h('input', {
            type: 'checkbox',
            className: 'dsh-as-switch',
            checked: pickerEnabled,
            onChange: (event: { currentTarget: { checked: boolean } }) => togglePicker(event.currentTarget.checked),
            'aria-label': t.toggleLabel,
          }),
          h('span', null, t.toggleLabel),
        ),
        h('span', { className: 'dsh-as-sub', style: { margin: 0 } }, t.toggleSub),
      ),
    ),

    h('section', { className: 'dsh-as-card' },
      h('div', { className: 'dsh-as-card-row' + (installedOpen ? ' dsh-as-row-open' : '') },
        h('div', {
          className: 'dsh-as-row',
          style: { cursor: 'pointer' },
          onClick: toggleInstalled,
          role: 'button',
          'aria-expanded': installedOpen,
          title: installedOpen ? t.collapseInstalled : t.expandInstalled,
        },
          h('div', { className: 'dsh-as-row-main' },
            h('div', { className: 'dsh-as-row-name' },
              t.installed,
              installed !== null ? h('span', { className: 'dsh-as-count' }, `${installed.length}${t.countSuffix}`) : null,
            ),
          ),
          h('span', { className: 'dsh-as-caret', 'aria-hidden': true }, installedOpen ? '▾' : '▸'),
        ),
        installedOpen
          ? h('div', { className: 'dsh-as-skill-list' },
            h('p', { className: 'dsh-as-sub', style: { marginTop: 0 } }, `${t.installDirLabel}：${installDir ?? '…'}`),
            installed !== null && installed.length > 0
              ? h('input', {
                className: 'dsh-as-input',
                style: { width: '100%', boxSizing: 'border-box' },
                value: installedQuery,
                onChange: (event: { currentTarget: { value: string } }) => setInstalledQuery(event.currentTarget.value),
                placeholder: t.searchPlaceholder,
                'aria-label': t.searchPlaceholder,
              })
              : null,
            installed === null
              ? h('p', { className: 'dsh-as-status' }, t.loading)
              : installed.length === 0
                ? h('p', { className: 'dsh-as-status' }, t.noSkills)
                : filteredInstalled.length === 0
                  ? h('p', { className: 'dsh-as-status' }, t.noMatch)
                  : h('div', { style: { display: 'grid', gap: 8 } },
                  filteredInstalled.map((skill) => {
                    const desc = pickLocalized(locale, skill.descriptionZh, skill.descriptionEn, skill.description) || t.noDescription
                    const usage = pickLocalized(locale, skill.whenToUseZh, skill.whenToUseEn, skill.whenToUse)
                    return h('div', { key: skill.name, className: 'dsh-as-row' },
                      h('div', { className: 'dsh-as-row-main' },
                        h('div', { className: 'dsh-as-row-name' }, `/${skill.name}`),
                        h('div', { className: 'dsh-as-row-desc' }, desc),
                        usage !== undefined && usage !== ''
                          ? h('div', { className: 'dsh-as-row-desc' }, `${t.usage}：${usage}`)
                          : null,
                      ),
                      h('button', {
                        type: 'button',
                        className: 'dsh-as-btn2 dsh-as-danger',
                        disabled: busy,
                        onClick: () => void uninstall(skill.name),
                        title: `${t.uninstall} ${skill.name}`,
                        'aria-label': `${t.uninstall} ${skill.name}`,
                      }, h(IconTrash), t.uninstall),
                    )
                  }),
                ),
          )
          : null,
      ),
    ),

    h('section', { className: 'dsh-as-card' },
      h('div', { className: 'dsh-as-card-row' + (importOpen ? ' dsh-as-row-open' : '') },
        h('div', {
          className: 'dsh-as-row',
          style: { cursor: 'pointer' },
          onClick: toggleImport,
          role: 'button',
          'aria-expanded': importOpen,
          title: importOpen ? t.collapseImport : t.expandImport,
        },
          h('div', { className: 'dsh-as-row-main' },
            h('div', { className: 'dsh-as-row-name' }, t.importTitle),
          ),
          h('span', { className: 'dsh-as-caret', 'aria-hidden': true }, importOpen ? '▾' : '▸'),
        ),
        importOpen
          ? h('div', { className: 'dsh-as-skill-list' },
            h('p', { className: 'dsh-as-sub', style: { marginTop: 0 } }, t.importSub),
            srcCwd !== undefined
              ? h('p', { className: 'dsh-as-sub' }, `${t.srcCwdLabel}${srcCwd}`)
              : null,
      sources === null
        ? h('p', { className: 'dsh-as-status' }, t.scanningSources)
        : h('div', { style: { display: 'grid', gap: 8 } },
          sources.filter((s) => s.exists || s.skills.length > 0).map((group) => {
            const open = expanded[group.id] === true
            return h('div', { key: group.id, className: 'dsh-as-card-row' + (open ? ' dsh-as-row-open' : '') },
              h('div', {
                className: 'dsh-as-row',
                style: { cursor: 'pointer' },
                onClick: () => setExpanded((prev) => ({ ...prev, [group.id]: !open })),
                role: 'button',
                'aria-expanded': open,
                title: t.dirTip,
              },
                h('div', { className: 'dsh-as-row-main' },
                  h('div', { className: 'dsh-as-row-name' },
                    group.label,
                    h('span', { className: 'dsh-as-count' }, `${group.skills.length}${t.countSuffix}`),
                  ),
                  h('div', { className: 'dsh-as-row-desc' }, group.path),
                ),
                h('button', {
                  type: 'button',
                  className: 'dsh-as-btn2 dsh-as-primary',
                  disabled: busy || group.skills.length === 0,
                  onClick: (event: { stopPropagation(): void }) => {
                    event.stopPropagation()
                    void importTool(group)
                  },
                  title: group.skills.length === 0 ? t.groupNoSkills : `${t.importAll} ${group.label} (${group.skills.length})`,
                }, h(IconBolt, { size: 12 }), t.importAll),
                h('span', { className: 'dsh-as-caret', 'aria-hidden': true }, open ? '▾' : '▸'),
              ),
              open
                ? h('div', { className: 'dsh-as-skill-list' },
                  group.skills.length === 0
                    ? h('div', { className: 'dsh-as-status' }, t.groupNoSkills)
                    : group.skills.map((skill) => h('div', { key: skill.name, className: 'dsh-as-skill-row' },
                      h('div', { className: 'dsh-as-row-main' },
                        h('div', { className: 'dsh-as-row-name' },
                          `/${skill.name}`,
                          skill.installed === true ? h('span', { className: 'dsh-as-installed' }, ` ✓ ${t.installedTag}`) : null,
                        ),
                        h('div', { className: 'dsh-as-row-desc' }, pickLocalized(locale, skill.descriptionZh, skill.descriptionEn, skill.description) || t.noDescription),
                        h('div', { className: 'dsh-as-row-desc' }, skill.path),
                      ),
                      skill.installed === true
                        ? h('span', { className: 'dsh-as-status', style: { flex: 'none' } }, t.installedTag)
                        : h('button', {
                          type: 'button',
                          className: 'dsh-as-btn2',
                          disabled: busy,
                          onClick: () => void importOne(group, skill),
                          title: `${t.importOne} ${skill.name}`,
                        }, h(IconBolt, { size: 12 }), t.importBtn),
                    )),
                )
                : null,
            )
          })),
            h('div', { className: 'dsh-as-toolbar' },
              h('input', {
                className: 'dsh-as-input',
                value: localPath,
                onChange: (event: { currentTarget: { value: string } }) => setLocalPath(event.currentTarget.value),
                placeholder: t.importPlaceholder,
                'aria-label': t.localDirAria,
              }),
              h('button', {
                type: 'button',
                className: 'dsh-as-btn2 dsh-as-primary',
                disabled: busy || localPath.trim() === '',
                onClick: () => void importLocal(),
              }, t.importBtn),
            ),
          )
          : null,
      ),
    ),

    h('section', { className: 'dsh-as-card' },
      h('h3', null, t.installTitle),
      h('p', { className: 'dsh-as-sub' }, t.installSub),
      h('div', { className: 'dsh-as-toolbar' },
        h('input', {
          className: 'dsh-as-input',
          value: remoteInput,
          onChange: (event: { currentTarget: { value: string } }) => setRemoteInput(event.currentTarget.value),
          placeholder: t.installPlaceholder,
          'aria-label': t.installInputAria,
        }),
        h('button', {
          type: 'button',
          className: 'dsh-as-btn2 dsh-as-primary',
          disabled: busy || remoteInput.trim() === '',
          onClick: () => void installRemote(),
          style: { minWidth: 84 },
        }, busy ? h(IconRefresh, { size: 12, spin: true }) : null, busy ? t.importing : t.installBtn),
      ),
    ),
  )
}

function guessSourceType(value: string): 'github' | 'npm' {
  const s = value.trim()
  if (s.includes('/') || s.startsWith('git@') || /^https?:\/\/github\.com\//i.test(s)) return 'github'
  return 'npm'
}

/* ---------------- apply ---------------- */

interface SlotRegistry {
  inject(key: string, callback: () => unknown): () => void
  register(opts: Record<string, unknown>, component: unknown): unknown
}

interface ClientContext {
  slots?: SlotRegistry
  get?(name: string): unknown
  effect?(callback: () => unknown, label?: string): unknown
}

export function apply(ctx: ClientContext): void {
  ensureStyles()
  const slots = ctx.slots
  if (slots === undefined) {
    console.warn(`[${NS}] slots service unavailable; skipping UI registration`)
    return
  }

  ctx.effect?.(
    () => slots.inject('conversation.input.right', () =>
      slots.register(
        { name: 'conversation.input.right', id: 'any-skills-picker', order: 100, label: 'Skill picker' },
        SkillPickerButton,
      ),
    ),
    `${NS}: composer skill picker`,
  )

  ctx.effect?.(
    () => slots.inject('settings.section', () =>
      slots.register(
        {
          name: 'settings.section',
          id: 'skills',
          order: 35,
          label: 'Skill 管理',
        },
        SkillsSettingsSection,
      ),
    ),
    `${NS}: settings section`,
  )
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
