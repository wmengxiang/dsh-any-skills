window.__ModuleLoader__.load({ id: 'dsh-any-skills', factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client.ts
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  buildInsertedDraft: () => buildInsertedDraft,
  currentLocale: () => currentLocale,
  inject: () => inject,
  loadInstalledOpen: () => loadInstalledOpen,
  pickLocalized: () => pickLocalized,
  saveInstalledOpen: () => saveInstalledOpen,
  uiText: () => uiText
});
module.exports = __toCommonJS(client_exports);
var import_react = require("react");
var inject = ["slots"];
var NS = "dsh-any-skills";
var API = "/api/skills";
var USAGE_KEY = "dsh-any-skills:usage";
function currentLocale() {
  try {
    const lang = String(document.documentElement.lang ?? "").toLowerCase();
    return lang.startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}
function pickLocalized(locale, zh, en, fallback) {
  if (locale === "zh") return zh ?? fallback;
  return en ?? fallback;
}
var ZH_TEXT = {
  usage: "\u7528\u6CD5",
  installed: "\u5DF2\u5B89\u88C5\u6280\u80FD",
  installDirLabel: "\u5B89\u88C5\u76EE\u5F55",
  loading: "\u6B63\u5728\u8BFB\u53D6\u2026",
  noSkills: "\u8FD8\u6CA1\u6709\u5B89\u88C5\u4EFB\u4F55\u6280\u80FD\u3002",
  uninstall: "\u5378\u8F7D",
  noDescription: "(\u65E0\u63CF\u8FF0)",
  pickerTitle: "\u9009\u62E9\u6280\u80FD\uFF08\u63D2\u5165 /\u6280\u80FD\u540D \u5230\u53D1\u9001\u6846\uFF09",
  pickerAria: "\u9009\u62E9\u6280\u80FD",
  searchPlaceholder: "\u641C\u7D22\u6280\u80FD\u2026",
  refresh: "\u5237\u65B0\u6280\u80FD\u5217\u8868",
  refreshAria: "\u5237\u65B0\u6280\u80FD\u5217\u8868",
  loadingSkills: "\u52A0\u8F7D\u4E2D\u2026",
  noSkillsInstalled: "\u8FD8\u6CA1\u6709\u5B89\u88C5\u6280\u80FD\u3002\u5230 \u8BBE\u7F6E \u2192 Skill \u7BA1\u7406 \u5BFC\u5165\u3002",
  noMatch: "\u6CA1\u6709\u5339\u914D\u7684\u6280\u80FD",
  loadFailed: "\u52A0\u8F7D\u5931\u8D25",
  expandInstalled: "\u70B9\u51FB\u5C55\u5F00\u5DF2\u5B89\u88C5\u6280\u80FD\u5217\u8868",
  collapseInstalled: "\u70B9\u51FB\u6298\u53E0\u5DF2\u5B89\u88C5\u6280\u80FD\u5217\u8868",
  pageTitle: "Skill \u7BA1\u7406",
  pageSub: "\u6280\u80FD\u5B58\u653E\u4E8E ~/.dsh/skills\uFF0C\u6A21\u578B\u53EF\u81EA\u52A8\u8BFB\u53D6\uFF1B\u5728\u5BF9\u8BDD\u6846\u65C1\u70B9\u51FB \u26A1 \u6309\u94AE\u53EF\u63D2\u5165 /\u6280\u80FD\u540D \u8C03\u7528\u3002",
  toggleLabel: "\u5728\u5BF9\u8BDD\u8F93\u5165\u6846\u65C1\u663E\u793A \u26A1 \u6280\u80FD\u9009\u62E9\u6309\u94AE",
  toggleSub: "\u5173\u95ED\u540E\u4ECD\u53EF\u5728\u8F93\u5165\u6846\u76F4\u63A5\u8F93\u5165 /\u6280\u80FD\u540D \u8C03\u7528",
  importTitle: "\u5BFC\u5165",
  importSub: "\u4ECE Codex / Claude Code / OpenCode \u6216\u672C\u673A\u76EE\u5F55\u590D\u5236\u6280\u80FD\u5230 ~/.dsh/skills\u3002",
  installTitle: "\u5B89\u88C5",
  installSub: "\u4ECE GitHub \u6216 npm \u5B89\u88C5\uFF08\u652F\u6301\u6279\u91CF\uFF0C\u7528\u7A7A\u683C/\u9017\u53F7/\u5206\u53F7\u5206\u9694\uFF09\u3002",
  importPlaceholder: "\u672C\u673A\u76EE\u5F55\u8DEF\u5F84\uFF08\u542B SKILL.md \u6216\u6280\u80FD\u6587\u4EF6\uFF09",
  installPlaceholder: "owner/repo \u6216 https://github.com/... \u6216 npm \u5305\u540D\uFF0C\u591A\u4E2A\u7528\u7A7A\u683C\u5206\u9694",
  importAll: "\u5BFC\u5165\u5168\u90E8",
  importOne: "\u4EC5\u5BFC\u5165",
  installedTag: "\u5DF2\u5B89\u88C5",
  importing: "\u5B89\u88C5\u4E2D\u2026",
  countSuffix: " \u4E2A\u6280\u80FD",
  installBtn: "\u5B89\u88C5",
  refreshBtn: "\u5237\u65B0",
  scanningSources: "\u6B63\u5728\u626B\u63CF\u6765\u6E90\u2026",
  groupNoSkills: "\u8BE5\u76EE\u5F55\u4E0B\u6CA1\u6709\u6280\u80FD",
  dirTip: "\u70B9\u51FB\u5C55\u5F00\u67E5\u770B\u6280\u80FD\u8BE6\u60C5",
  importBtn: "\u5BFC\u5165",
  localDirAria: "\u672C\u673A\u76EE\u5F55\u8DEF\u5F84",
  installInputAria: "GitHub \u4ED3\u5E93\u6216 npm \u5305\u540D",
  restore: "\u6062\u590D",
  closeNotice: "\u5173\u95ED\u63D0\u793A",
  restoreHint: "\u624B\u52A8\u6062\u590D\uFF1A\u5C06\u56DE\u6536\u76EE\u5F55\u79FB\u56DE\u5B89\u88C5\u76EE\u5F55\uFF08\u5728\u7EC8\u7AEF\u6267\u884C {cmd}\uFF09\uFF0C\u6216\u76F4\u63A5\u70B9\u51FB\u300C\u6062\u590D\u300D\u6309\u94AE\u3002",
  pickerOnNotice: "\u5DF2\u5F00\u542F \u26A1 \u6280\u80FD\u9009\u62E9\u6309\u94AE\uFF08\u5BF9\u8BDD\u6846\u65C1\uFF09",
  pickerOffNotice: "\u5DF2\u5173\u95ED \u26A1 \u6280\u80FD\u9009\u62E9\u6309\u94AE\uFF1B\u4ECD\u53EF\u5728\u8F93\u5165\u6846\u8F93\u5165 /\u6280\u80FD\u540D \u8C03\u7528\u6280\u80FD",
  importedNotice: "\u5DF2\u5BFC\u5165 {n} \u4E2A\u6280\u80FD",
  skippedSuffix: "\uFF08{n} \u4E2A\u5DF2\u5B58\u5728\uFF0C\u8DF3\u8FC7\uFF09",
  installedNotice: "\u5DF2\u5B89\u88C5 {n} \u4E2A\u6280\u80FD\uFF08{ok}/{total} \u4E2A\u6765\u6E90\u6210\u529F\uFF09",
  installDoneNotice: "\u5B89\u88C5\u5B8C\u6210",
  localPathRequired: "\u8BF7\u8F93\u5165\u672C\u673A\u76EE\u5F55\u8DEF\u5F84",
  remoteInputRequired: "\u8BF7\u8F93\u5165 GitHub \u4ED3\u5E93\uFF08owner/repo \u6216 URL\uFF09\u6216 npm \u5305\u540D"
};
var EN_TEXT = {
  usage: "Usage",
  installed: "Installed Skills",
  installDirLabel: "Install directory",
  loading: "Loading\u2026",
  noSkills: "No skills installed yet.",
  uninstall: "Uninstall",
  noDescription: "(no description)",
  pickerTitle: "Pick a skill (inserts /skill-name into the input)",
  pickerAria: "Pick a skill",
  searchPlaceholder: "Search skills\u2026",
  refresh: "Refresh skill list",
  refreshAria: "Refresh skill list",
  loadingSkills: "Loading\u2026",
  noSkillsInstalled: "No skills installed yet. Import from Settings \u2192 Skill Manager.",
  noMatch: "No matching skills",
  loadFailed: "Failed to load",
  expandInstalled: "Click to expand the installed skills list",
  collapseInstalled: "Click to collapse the installed skills list",
  pageTitle: "Skill Manager",
  pageSub: "Skills live in ~/.dsh/skills and are read automatically by the model; click the \u26A1 button beside the input to insert /skill-name.",
  toggleLabel: "Show the \u26A1 skill picker beside the input",
  toggleSub: "When off, type /skill-name directly in the input",
  importTitle: "Import",
  importSub: "Copy skills from Codex / Claude Code / OpenCode or a local directory into ~/.dsh/skills.",
  installTitle: "Install",
  installSub: "Install from GitHub or npm (batch: space/comma/semicolon separated).",
  importPlaceholder: "Local directory path (contains SKILL.md or skill files)",
  installPlaceholder: "owner/repo or https://github.com/... or npm package, space-separated",
  importAll: "Import all",
  importOne: "Import only",
  installedTag: "Installed",
  importing: "Installing\u2026",
  countSuffix: " skills",
  installBtn: "Install",
  refreshBtn: "Refresh",
  scanningSources: "Scanning sources\u2026",
  groupNoSkills: "No skills in this directory",
  dirTip: "Click to expand skill details",
  importBtn: "Import",
  localDirAria: "Local directory path",
  installInputAria: "GitHub repo or npm package",
  restore: "Restore",
  closeNotice: "Dismiss",
  restoreHint: 'Restore manually: move the trash directory back into the install directory (in a terminal: {cmd}), or click "Restore".',
  pickerOnNotice: "\u26A1 skill picker enabled (beside the input)",
  pickerOffNotice: "\u26A1 skill picker disabled; type /skill-name in the input to invoke skills",
  importedNotice: "Imported {n} skills",
  skippedSuffix: " ({n} already exist, skipped)",
  installedNotice: "Installed {n} skills ({ok}/{total} sources OK)",
  installDoneNotice: "Install finished",
  localPathRequired: "Enter a local directory path",
  remoteInputRequired: "Enter a GitHub repo (owner/repo or URL) or an npm package name"
};
function uiText(locale) {
  return locale === "zh" ? ZH_TEXT : EN_TEXT;
}
async function api(path, init) {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers ?? {} },
    cache: "no-store"
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data === null || data.ok !== true) {
    const message = data && typeof data.message === "string" ? data.message : `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}
var apiList = () => api(`${API}/list`);
var apiSources = (cwd) => api(`${API}/sources?cwd=${encodeURIComponent(cwd)}`);
var apiImport = (body) => api(`${API}/import`, { method: "POST", body: JSON.stringify(body) });
var apiInstall = (sources) => api(`${API}/install`, { method: "POST", body: JSON.stringify({ sources }) });
var apiUninstall = (name) => api(`${API}/uninstall`, { method: "DELETE", body: JSON.stringify({ name }) });
var apiRestore = (name, trash) => api(`${API}/restore`, { method: "POST", body: JSON.stringify({ name, trash }) });
var STYLE_ID = "dsh-any-skills-style";
var CSS = [
  ".dsh-as-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;margin:0 2px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.28));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 6%,transparent);color:var(--dsw-alias-label-secondary,#8a94a6);cursor:pointer;padding:0;transition:background-color .18s ease,color .18s ease,border-color .18s ease}",
  ".dsh-as-btn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 14%,transparent);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1,rgba(128,128,128,.4))}",
  ".dsh-as-btn:disabled{opacity:.45;cursor:not-allowed}",
  ".dsh-as-btn.dsh-as-open{color:var(--dsw-alias-brand-primary,#4f8cff);border-color:var(--dsw-alias-brand-primary,#4f8cff);background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f8cff) 12%,transparent)}",
  ".dsh-as-pop{position:absolute;bottom:calc(100% + 8px);right:0;width:340px;max-height:340px;display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.35);overflow:hidden;z-index:1000}",
  ".dsh-as-search{box-sizing:border-box;width:calc(100% - 16px);margin:8px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 10%,transparent);color:var(--dsw-alias-label-primary);font-size:13px;outline:none;flex:none}",
  ".dsh-as-list{overflow-y:auto;flex:auto;padding:0 6px 8px}",
  ".dsh-as-item{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;padding:7px 10px;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left}",
  ".dsh-as-item:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent)}",
  ".dsh-as-name{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;font-weight:500}",
  ".dsh-as-desc{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}",
  ".dsh-as-status{padding:12px;color:var(--dsw-alias-label-secondary,#8a94a6);font-size:13px}",
  ".dsh-as-page{display:grid;gap:18px;width:100%;min-width:0;max-width:780px;padding:6px 0 36px;font-size:14px;line-height:1.55;color:var(--dsw-alias-label-primary)}",
  ".dsh-as-card{display:grid;gap:10px;padding:16px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.22));border-radius:12px;background:var(--dsw-alias-bg-layer-1,transparent)}",
  ".dsh-as-card h3{margin:0;font-size:15px;font-weight:600}",
  ".dsh-as-sub{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12.5px;margin:-4px 0 2px}",
  ".dsh-as-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.16));border-radius:10px;min-width:0}",
  ".dsh-as-row-main{flex:1;min-width:0}",
  ".dsh-as-count{display:inline-flex;align-items:center;margin-left:8px;padding:0 8px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent);color:var(--dsw-alias-label-secondary,#8a94a6);font-size:11.5px;font-weight:600;vertical-align:2px}",
  ".dsh-as-caret{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12px;flex:none}",
  ".dsh-as-card-row{display:grid;gap:0;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.16));border-radius:10px;overflow:hidden}",
  ".dsh-as-card-row .dsh-as-row{border:none;border-radius:0}",
  ".dsh-as-card-row.dsh-as-row-open .dsh-as-row{background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 6%,transparent)}",
  ".dsh-as-skill-list{display:grid;gap:6px;padding:8px 10px 10px;border-top:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.12))}",
  ".dsh-as-skill-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.12));border-radius:8px;min-width:0}",
  ".dsh-as-installed{color:var(--dsw-alias-state-success-primary,#7bdca8);font-size:12px;font-weight:500}",
  ".dsh-as-code{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent);padding:1px 5px;border-radius:4px;word-break:break-all}",
  ".dsh-as-toggle{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-size:13px;font-weight:500;color:var(--dsw-alias-label-primary);user-select:none}",
  ".dsh-as-switch{position:relative;width:36px;height:20px;flex:none;appearance:none;-webkit-appearance:none;margin:0;background:color-mix(in srgb,var(--dsw-alias-label-secondary,#8a94a6) 32%,transparent);border-radius:999px;cursor:pointer;transition:background .15s ease;outline:none}",
  '.dsh-as-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 1px 2px rgba(0,0,0,.3);transition:transform .15s ease}',
  ".dsh-as-switch:checked{background:var(--dsw-alias-brand-primary,#4f8cff)}",
  ".dsh-as-switch:checked::after{transform:translateX(16px)}",
  ".dsh-as-switch:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4f8cff);outline-offset:2px}",
  ".dsh-as-row-name{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".dsh-as-row-desc{color:var(--dsw-alias-label-secondary,#8a94a6);font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
  ".dsh-as-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
  ".dsh-as-input{flex:1;min-width:180px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);color:inherit;border-radius:8px;padding:7px 11px;font-size:13px;outline:none}",
  ".dsh-as-input:focus{border-color:var(--dsw-alias-brand-primary,#4f8cff)}",
  ".dsh-as-btn2{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.24));background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 5%,transparent);color:var(--dsw-alias-label-primary);font-size:12.5px;font-weight:500;cursor:pointer;white-space:nowrap;transition:background-color .18s ease,color .18s ease,border-color .18s ease,box-shadow .18s ease}",
  ".dsh-as-btn2:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 12%,transparent);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1,rgba(128,128,128,.45))}",
  ".dsh-as-btn2:active:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary,#8a94a6) 18%,transparent)}",
  ".dsh-as-btn2:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#4f8cff);outline-offset:2px}",
  ".dsh-as-btn2:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}",
  ".dsh-as-btn2.dsh-as-primary{background:var(--dsw-alias-brand-primary,#4f8cff);border-color:transparent;color:var(--dsw-alias-bg-base,#fff);box-shadow:0 1px 2px rgba(0,0,0,.2)}",
  ".dsh-as-btn2.dsh-as-primary:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f8cff) 88%,#000);color:var(--dsw-alias-bg-base,#fff);border-color:transparent;box-shadow:0 1px 3px rgba(0,0,0,.28)}",
  ".dsh-as-btn2.dsh-as-primary:active:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary,#4f8cff) 78%,#000)}",
  ".dsh-as-btn2.dsh-as-danger{color:var(--dsw-alias-state-error-primary,#e05c5c);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05c5c) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05c5c) 5%,transparent)}",
  ".dsh-as-btn2.dsh-as-danger:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#e05c5c);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e05c5c) 12%,transparent);border-color:var(--dsw-alias-state-error-primary,#e05c5c)}",
  ".dsh-as-err{display:flex;gap:8px;align-items:center;padding:9px 12px;border-radius:8px;font-size:12.5px;color:var(--dsw-alias-state-warn-primary,#e0a13c);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a13c) 8%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#e0a13c) 30%,transparent)}",
  ".dsh-as-ok{display:flex;gap:8px;align-items:center;padding:9px 12px;border-radius:8px;font-size:12.5px;color:var(--dsw-alias-state-success-primary,#7bdca8);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#7bdca8) 8%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-success-primary,#7bdca8) 28%,transparent)}",
  ".dsh-as-spin{animation:dsh-as-spin .9s linear infinite}",
  "@keyframes dsh-as-spin{to{transform:rotate(360deg)}}"
].join("\n");
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.setAttribute("data-plugin", NS);
  style.textContent = CSS;
  document.head.appendChild(style);
}
function IconBolt(props) {
  return (0, import_react.createElement)(
    "svg",
    {
      width: props.size ?? 16,
      height: props.size ?? 16,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className: props.spin === true ? "dsh-as-spin" : void 0,
      "aria-hidden": true,
      style: { flex: "0 0 auto" }
    },
    (0, import_react.createElement)("path", { d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z" })
  );
}
function IconTrash() {
  return (0, import_react.createElement)(
    "svg",
    { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { flex: "0 0 auto" } },
    (0, import_react.createElement)("path", { d: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" })
  );
}
function IconRefresh(props) {
  return (0, import_react.createElement)(
    "svg",
    {
      width: props.size ?? 14,
      height: props.size ?? 14,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      className: props.spin === true ? "dsh-as-spin" : void 0,
      style: { flex: "0 0 auto" }
    },
    (0, import_react.createElement)("path", { d: "M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" })
  );
}
function loadUsage() {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function saveUsage(usage) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {
  }
}
var INSTALLED_OPEN_KEY = "dsh-any-skills:installed-open";
function loadInstalledOpen() {
  try {
    return localStorage.getItem(INSTALLED_OPEN_KEY) !== "0";
  } catch {
    return true;
  }
}
function saveInstalledOpen(open) {
  try {
    localStorage.setItem(INSTALLED_OPEN_KEY, open ? "1" : "0");
  } catch {
  }
}
var SHOW_PICKER_KEY = "dsh-any-skills:show-picker";
var pickerListeners = /* @__PURE__ */ new Set();
function isPickerEnabled() {
  try {
    return localStorage.getItem(SHOW_PICKER_KEY) !== "0";
  } catch {
    return true;
  }
}
function applyPickerEnabled(enabled) {
  try {
    localStorage.setItem(SHOW_PICKER_KEY, enabled ? "1" : "0");
  } catch {
  }
  pickerListeners.forEach((listener) => listener());
}
function subscribePickerEnabled(listener) {
  pickerListeners.add(listener);
  return () => {
    pickerListeners.delete(listener);
  };
}
function rankByUsage(skills, usage) {
  return skills.slice().sort((a, b) => {
    const ua = usage[a.name];
    const ub = usage[b.name];
    const la = ua?.lastUsed ?? 0;
    const lb = ub?.lastUsed ?? 0;
    if (la !== lb) return lb - la;
    const ca = ua?.count ?? 0;
    const cb = ub?.count ?? 0;
    if (ca !== cb) return cb - ca;
    return a.name.localeCompare(b.name);
  });
}
function buildInsertedDraft(draft, name, range) {
  if (range === void 0 || range.start < 0) {
    const sep = draft === "" || draft.endsWith(" ") || draft.endsWith("\n") ? "" : " ";
    const text2 = `${draft}${sep}/${name} `;
    return { text: text2, caret: text2.length };
  }
  const start = Math.min(range.start, draft.length);
  const end = range.end > start ? Math.min(range.end, draft.length) : start;
  const prefix = draft.slice(0, start);
  const suffix = draft.slice(end);
  const sepBefore = prefix === "" || prefix.endsWith(" ") || prefix.endsWith("\n") ? "" : " ";
  const sepAfter = suffix === "" ? " " : suffix.startsWith(" ") || suffix.startsWith("\n") ? "" : " ";
  const text = `${prefix}${sepBefore}/${name}${sepAfter}${suffix}`;
  const caret = start + sepBefore.length + 1 + name.length + sepAfter.length;
  return { text, caret };
}
function findComposerTextarea(box) {
  let el = box;
  while (el !== null) {
    try {
      const card = el.querySelector("[data-composer-card]");
      if (card !== null) {
        const ta = card.querySelector("textarea");
        return ta instanceof HTMLTextAreaElement ? ta : null;
      }
    } catch {
      return null;
    }
    el = el.parentElement;
  }
  return null;
}
function SkillPickerButton(props) {
  const [enabled, setEnabled] = (0, import_react.useState)(() => isPickerEnabled());
  (0, import_react.useEffect)(() => subscribePickerEnabled(() => setEnabled(isPickerEnabled())), []);
  const [open, setOpen] = (0, import_react.useState)(false);
  const [skills, setSkills] = (0, import_react.useState)(void 0);
  const [error, setError] = (0, import_react.useState)(void 0);
  const [query, setQuery] = (0, import_react.useState)("");
  const [usage, setUsage] = (0, import_react.useState)(() => loadUsage());
  const boxRef = (0, import_react.useRef)(null);
  const taEverFocusedRef = (0, import_react.useRef)(false);
  (0, import_react.useEffect)(() => {
    const onFocusIn = (event) => {
      try {
        if (event.target instanceof HTMLTextAreaElement && event.target === findComposerTextarea(boxRef.current)) {
          taEverFocusedRef.current = true;
        }
      } catch {
      }
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);
  const load = (0, import_react.useCallback)(async (force = false) => {
    if (!force && (skills !== void 0 || error !== void 0)) return;
    if (force) {
      setSkills(void 0);
      setError(void 0);
    }
    try {
      const data = await apiList();
      setSkills(data.skills ?? []);
    } catch (cause) {
      setError(messageOf(cause));
    }
  }, [skills, error]);
  const toggle = () => {
    if (!open) void load(true);
    setOpen((value) => !value);
  };
  const pick = (name) => {
    let draft = "";
    if (props.input !== void 0 && typeof props.input.draft === "string") {
      draft = props.input.draft;
    } else if (typeof props.useInput === "function") {
      try {
        const state = props.useInput((s) => s);
        if (state !== void 0 && typeof state.draft === "string") draft = state.draft;
      } catch {
      }
    }
    let range;
    try {
      const ta = findComposerTextarea(boxRef.current);
      if (ta !== null && ta.value === draft && taEverFocusedRef.current) {
        const start = ta.selectionStart;
        if (start >= 0) {
          const end = ta.selectionEnd > start ? ta.selectionEnd : start;
          range = { start, end };
        }
      }
    } catch {
    }
    const { text, caret } = buildInsertedDraft(draft, name, range);
    try {
      if (typeof props.inputActions?.setDraft === "function") {
        props.inputActions.setDraft(text);
      } else {
        console.warn(`[${NS}] inputActions.setDraft unavailable; draft not written:`, text);
      }
    } catch (cause) {
      console.error(`[${NS}] setDraft failed:`, cause);
    }
    try {
      const ta = findComposerTextarea(boxRef.current);
      if (ta !== null && typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => {
          try {
            ta.focus();
            if (ta.value === text) ta.setSelectionRange(caret, caret);
          } catch {
          }
        });
      }
    } catch {
    }
    const nextUsage = { ...usage, [name]: { count: (usage[name]?.count ?? 0) + 1, lastUsed: Date.now() } };
    setUsage(nextUsage);
    saveUsage(nextUsage);
    setOpen(false);
    setQuery("");
  };
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const onDown = (event) => {
      if (boxRef.current !== null && event.target instanceof Node && !boxRef.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const ordered = rankByUsage(skills ?? [], usage);
  const q = query.trim().toLowerCase();
  const filtered = ordered.filter((skill) => q === "" || skill.name.toLowerCase().includes(q) || String(skill.description ?? "").toLowerCase().includes(q)).slice(0, 80);
  if (!enabled) return null;
  const locale = currentLocale();
  const t = uiText(locale);
  return (0, import_react.createElement)(
    "div",
    { ref: boxRef, style: { position: "relative", display: "inline-flex", flex: "none" } },
    (0, import_react.createElement)("button", {
      type: "button",
      className: "dsh-as-btn" + (open ? " dsh-as-open" : ""),
      onClick: toggle,
      title: t.pickerTitle,
      "aria-label": t.pickerAria,
      "aria-expanded": open
    }, (0, import_react.createElement)(IconBolt, { size: 16 })),
    open ? (0, import_react.createElement)(
      "div",
      { className: "dsh-as-pop", role: "dialog", "aria-label": t.pickerAria },
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 4, padding: "8px 10px 2px" } },
        (0, import_react.createElement)("input", {
          className: "dsh-as-search",
          style: { margin: 0, flex: 1 },
          value: query,
          onChange: (event) => setQuery(event.currentTarget.value),
          placeholder: t.searchPlaceholder,
          autoFocus: true
        }),
        (0, import_react.createElement)("button", {
          type: "button",
          className: "dsh-as-btn",
          onClick: () => void load(true),
          title: t.refresh,
          "aria-label": t.refreshAria
        }, (0, import_react.createElement)(IconRefresh, { size: 12 }))
      ),
      error !== void 0 ? (0, import_react.createElement)("div", { className: "dsh-as-status" }, `${t.loadFailed}\uFF1A${error}`) : skills === void 0 ? (0, import_react.createElement)("div", { className: "dsh-as-status" }, t.loadingSkills) : (0, import_react.createElement)(
        "div",
        { className: "dsh-as-list" },
        filtered.length === 0 ? (0, import_react.createElement)("div", { className: "dsh-as-status" }, skills.length === 0 ? t.noSkillsInstalled : t.noMatch) : filtered.map((skill) => {
          const desc = pickLocalized(locale, skill.descriptionZh, skill.descriptionEn, skill.description ?? "");
          const usage2 = pickLocalized(locale, skill.whenToUseZh, skill.whenToUseEn, skill.whenToUse);
          return (0, import_react.createElement)(
            "button",
            {
              key: skill.name,
              type: "button",
              className: "dsh-as-item",
              onClick: () => pick(skill.name)
            },
            (0, import_react.createElement)("span", { className: "dsh-as-name" }, `/${skill.name}`),
            (0, import_react.createElement)("span", { className: "dsh-as-desc" }, desc),
            usage2 !== void 0 && usage2 !== "" ? (0, import_react.createElement)("span", { className: "dsh-as-desc" }, usage2) : null
          );
        })
      )
    ) : null
  );
}
function SkillsSettingsSection() {
  const [installed, setInstalled] = (0, import_react.useState)(null);
  const [installDir, setInstallDir] = (0, import_react.useState)(void 0);
  const [sources, setSources] = (0, import_react.useState)(null);
  const [srcCwd, setSrcCwd] = (0, import_react.useState)(void 0);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [notice, setNotice] = (0, import_react.useState)(void 0);
  const [error, setError] = (0, import_react.useState)(void 0);
  const [localPath, setLocalPath] = (0, import_react.useState)("");
  const [remoteInput, setRemoteInput] = (0, import_react.useState)("");
  const [expanded, setExpanded] = (0, import_react.useState)({});
  const [lastUninstall, setLastUninstall] = (0, import_react.useState)(null);
  const [pickerEnabled, setPickerEnabledState] = (0, import_react.useState)(() => isPickerEnabled());
  const [installedOpen, setInstalledOpen] = (0, import_react.useState)(() => loadInstalledOpen());
  const locale = currentLocale();
  const t = uiText(locale);
  const toggleInstalled = () => {
    setInstalledOpen((open) => {
      const next = !open;
      saveInstalledOpen(next);
      return next;
    });
  };
  const togglePicker = (value) => {
    setPickerEnabledState(value);
    applyPickerEnabled(value);
    setNotice(value ? t.pickerOnNotice : t.pickerOffNotice);
  };
  const refresh = (0, import_react.useCallback)(async () => {
    setBusy(true);
    setError(void 0);
    try {
      const [list, src] = await Promise.all([apiList(), apiSources("")]);
      setInstalled(list.skills);
      setInstallDir(list.installDir);
      setSources(src.sources);
      setSrcCwd(src.cwd);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  (0, import_react.useEffect)(() => {
    ensureStyles();
    void refresh();
  }, [refresh]);
  const run = (0, import_react.useCallback)(async (action) => {
    setBusy(true);
    setError(void 0);
    setNotice(void 0);
    try {
      await action();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }, []);
  const uninstall = (name) => run(async () => {
    const result = await apiUninstall(name);
    if (result.trash !== void 0) {
      setLastUninstall({ name, trash: result.trash, message: result.message });
    } else {
      setNotice(result.message);
    }
    await refresh();
  });
  const restore = (info) => run(async () => {
    const result = await apiRestore(info.name, info.trash);
    setLastUninstall(null);
    setNotice(result.message);
    await refresh();
  });
  const importTool = (group) => run(async () => {
    const result = await apiImport({ type: group.tool, sourceId: group.id });
    setNotice(t.importedNotice.replace("{n}", String(result.imported.length)) + (result.skipped !== void 0 && result.skipped.length > 0 ? t.skippedSuffix.replace("{n}", String(result.skipped.length)) : ""));
    await refresh();
  });
  const importOne = (group, skill) => run(async () => {
    const result = await apiImport({ type: group.tool, sourceId: group.id, names: [skill.name] });
    setNotice(t.importedNotice.replace("{n}", String(result.imported.length)) + (result.skipped !== void 0 && result.skipped.length > 0 ? t.skippedSuffix.replace("{n}", String(result.skipped.length)) : ""));
    await refresh();
  });
  const importLocal = () => run(async () => {
    if (localPath.trim() === "") {
      setError(t.localPathRequired);
      return;
    }
    const result = await apiImport({ type: "local", path: localPath.trim() });
    setNotice(t.importedNotice.replace("{n}", String(result.imported.length)));
    setLocalPath("");
    await refresh();
  });
  const installRemote = () => run(async () => {
    const parts = remoteInput.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) {
      setError(t.remoteInputRequired);
      return;
    }
    const sources2 = parts.map((part) => ({ type: guessSourceType(part), value: part }));
    const result = await apiInstall(sources2);
    const ok = result.results.filter((r) => r.ok);
    const failed = result.results.filter((r) => !r.ok);
    setNotice(
      ok.length > 0 ? t.installedNotice.replace("{n}", String(ok.reduce((n, r) => n + (r.installed?.length ?? 0), 0))).replace("{ok}", String(ok.length)).replace("{total}", String(result.results.length)) : t.installDoneNotice
    );
    if (failed.length > 0) {
      setError(failed.map((f) => `${f.source}: ${f.message}`).join("\uFF1B"));
    } else {
      setError(void 0);
    }
    setRemoteInput("");
    await refresh();
  });
  return (0, import_react.createElement)(
    "div",
    { className: "dsh-as-page", "aria-busy": busy },
    (0, import_react.createElement)(
      "header",
      { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" } },
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        (0, import_react.createElement)("h2", { style: { margin: 0, fontSize: 18, fontWeight: 600 } }, t.pageTitle),
        busy ? (0, import_react.createElement)(IconRefresh, { spin: true }) : null
      ),
      (0, import_react.createElement)(
        "button",
        { type: "button", className: "dsh-as-btn2", onClick: () => void refresh(), disabled: busy, title: t.refreshBtn },
        (0, import_react.createElement)(IconRefresh),
        t.refreshBtn
      )
    ),
    (0, import_react.createElement)(
      "p",
      { className: "dsh-as-sub", style: { marginTop: -6 } },
      t.pageSub
    ),
    error !== void 0 ? (0, import_react.createElement)("div", { className: "dsh-as-err", role: "alert" }, error) : null,
    notice !== void 0 ? (0, import_react.createElement)("div", { className: "dsh-as-ok", role: "status" }, notice) : null,
    lastUninstall !== null ? (0, import_react.createElement)(
      "div",
      { className: "dsh-as-ok", role: "status", style: { alignItems: "flex-start" } },
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 } },
        (0, import_react.createElement)("div", null, lastUninstall.message),
        (0, import_react.createElement)(
          "div",
          { className: "dsh-as-sub", style: { margin: 0 } },
          t.restoreHint.replace("{cmd}", `mv ${installDir ?? "~/.dsh/skills"}/${lastUninstall.trash} ${installDir ?? "~/.dsh/skills"}/${lastUninstall.name}`)
        )
      ),
      (0, import_react.createElement)("button", {
        type: "button",
        className: "dsh-as-btn2 dsh-as-primary",
        disabled: busy,
        onClick: () => void restore(lastUninstall),
        title: `${t.restore} ${lastUninstall.name}`
      }, (0, import_react.createElement)(IconRefresh), t.restore),
      (0, import_react.createElement)("button", {
        type: "button",
        className: "dsh-as-btn2",
        disabled: busy,
        onClick: () => setLastUninstall(null),
        title: t.closeNotice,
        "aria-label": t.closeNotice
      }, "\xD7")
    ) : null,
    (0, import_react.createElement)(
      "section",
      { className: "dsh-as-card" },
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
        (0, import_react.createElement)(
          "label",
          { className: "dsh-as-toggle" },
          (0, import_react.createElement)("input", {
            type: "checkbox",
            className: "dsh-as-switch",
            checked: pickerEnabled,
            onChange: (event) => togglePicker(event.currentTarget.checked),
            "aria-label": t.toggleLabel
          }),
          (0, import_react.createElement)("span", null, t.toggleLabel)
        ),
        (0, import_react.createElement)("span", { className: "dsh-as-sub", style: { margin: 0 } }, t.toggleSub)
      )
    ),
    (0, import_react.createElement)(
      "section",
      { className: "dsh-as-card" },
      (0, import_react.createElement)(
        "div",
        { className: "dsh-as-card-row" + (installedOpen ? " dsh-as-row-open" : "") },
        (0, import_react.createElement)(
          "div",
          {
            className: "dsh-as-row",
            style: { cursor: "pointer" },
            onClick: toggleInstalled,
            role: "button",
            "aria-expanded": installedOpen,
            title: installedOpen ? t.collapseInstalled : t.expandInstalled
          },
          (0, import_react.createElement)(
            "div",
            { className: "dsh-as-row-main" },
            (0, import_react.createElement)(
              "div",
              { className: "dsh-as-row-name" },
              t.installed,
              installed !== null ? (0, import_react.createElement)("span", { className: "dsh-as-count" }, `${installed.length}${t.countSuffix}`) : null
            )
          ),
          (0, import_react.createElement)("span", { className: "dsh-as-caret", "aria-hidden": true }, installedOpen ? "\u25BE" : "\u25B8")
        ),
        installedOpen ? (0, import_react.createElement)(
          "div",
          { className: "dsh-as-skill-list" },
          (0, import_react.createElement)("p", { className: "dsh-as-sub", style: { marginTop: 0 } }, `${t.installDirLabel}\uFF1A${installDir ?? "\u2026"}`),
          installed === null ? (0, import_react.createElement)("p", { className: "dsh-as-status" }, t.loading) : installed.length === 0 ? (0, import_react.createElement)("p", { className: "dsh-as-status" }, t.noSkills) : (0, import_react.createElement)(
            "div",
            { style: { display: "grid", gap: 8 } },
            installed.map((skill) => {
              const desc = pickLocalized(locale, skill.descriptionZh, skill.descriptionEn, skill.description) || t.noDescription;
              const usage = pickLocalized(locale, skill.whenToUseZh, skill.whenToUseEn, skill.whenToUse);
              return (0, import_react.createElement)(
                "div",
                { key: skill.name, className: "dsh-as-row" },
                (0, import_react.createElement)(
                  "div",
                  { className: "dsh-as-row-main" },
                  (0, import_react.createElement)("div", { className: "dsh-as-row-name" }, `/${skill.name}`),
                  (0, import_react.createElement)("div", { className: "dsh-as-row-desc" }, desc),
                  usage !== void 0 && usage !== "" ? (0, import_react.createElement)("div", { className: "dsh-as-row-desc" }, `${t.usage}\uFF1A${usage}`) : null
                ),
                (0, import_react.createElement)("button", {
                  type: "button",
                  className: "dsh-as-btn2 dsh-as-danger",
                  disabled: busy,
                  onClick: () => void uninstall(skill.name),
                  title: `${t.uninstall} ${skill.name}`,
                  "aria-label": `${t.uninstall} ${skill.name}`
                }, (0, import_react.createElement)(IconTrash), t.uninstall)
              );
            })
          )
        ) : null
      )
    ),
    (0, import_react.createElement)(
      "section",
      { className: "dsh-as-card" },
      (0, import_react.createElement)("h3", null, t.importTitle),
      (0, import_react.createElement)("p", { className: "dsh-as-sub" }, t.importSub),
      srcCwd !== void 0 ? (0, import_react.createElement)("p", { className: "dsh-as-sub" }, `\u9879\u76EE\u7EA7\u76EE\u5F55\u57FA\u4E8E\u670D\u52A1\u542F\u52A8\u76EE\u5F55\u68C0\u6D4B\uFF1A${srcCwd}`) : null,
      sources === null ? (0, import_react.createElement)("p", { className: "dsh-as-status" }, t.scanningSources) : (0, import_react.createElement)(
        "div",
        { style: { display: "grid", gap: 8 } },
        sources.filter((s) => s.exists || s.skills.length > 0).map((group) => {
          const open = expanded[group.id] === true;
          return (0, import_react.createElement)(
            "div",
            { key: group.id, className: "dsh-as-card-row" + (open ? " dsh-as-row-open" : "") },
            (0, import_react.createElement)(
              "div",
              {
                className: "dsh-as-row",
                style: { cursor: "pointer" },
                onClick: () => setExpanded((prev) => ({ ...prev, [group.id]: !open })),
                role: "button",
                "aria-expanded": open,
                title: t.dirTip
              },
              (0, import_react.createElement)(
                "div",
                { className: "dsh-as-row-main" },
                (0, import_react.createElement)(
                  "div",
                  { className: "dsh-as-row-name" },
                  group.label,
                  (0, import_react.createElement)("span", { className: "dsh-as-count" }, `${group.skills.length}${t.countSuffix}`)
                ),
                (0, import_react.createElement)("div", { className: "dsh-as-row-desc" }, group.path)
              ),
              (0, import_react.createElement)("button", {
                type: "button",
                className: "dsh-as-btn2 dsh-as-primary",
                disabled: busy || group.skills.length === 0,
                onClick: (event) => {
                  event.stopPropagation();
                  void importTool(group);
                },
                title: group.skills.length === 0 ? t.groupNoSkills : `${t.importAll} ${group.label} (${group.skills.length})`
              }, (0, import_react.createElement)(IconBolt, { size: 12 }), t.importAll),
              (0, import_react.createElement)("span", { className: "dsh-as-caret", "aria-hidden": true }, open ? "\u25BE" : "\u25B8")
            ),
            open ? (0, import_react.createElement)(
              "div",
              { className: "dsh-as-skill-list" },
              group.skills.length === 0 ? (0, import_react.createElement)("div", { className: "dsh-as-status" }, t.groupNoSkills) : group.skills.map((skill) => (0, import_react.createElement)(
                "div",
                { key: skill.name, className: "dsh-as-skill-row" },
                (0, import_react.createElement)(
                  "div",
                  { className: "dsh-as-row-main" },
                  (0, import_react.createElement)(
                    "div",
                    { className: "dsh-as-row-name" },
                    `/${skill.name}`,
                    skill.installed === true ? (0, import_react.createElement)("span", { className: "dsh-as-installed" }, ` \u2713 ${t.installedTag}`) : null
                  ),
                  (0, import_react.createElement)("div", { className: "dsh-as-row-desc" }, pickLocalized(locale, skill.descriptionZh, skill.descriptionEn, skill.description) || t.noDescription),
                  (0, import_react.createElement)("div", { className: "dsh-as-row-desc" }, skill.path)
                ),
                skill.installed === true ? (0, import_react.createElement)("span", { className: "dsh-as-status", style: { flex: "none" } }, t.installedTag) : (0, import_react.createElement)("button", {
                  type: "button",
                  className: "dsh-as-btn2",
                  disabled: busy,
                  onClick: () => void importOne(group, skill),
                  title: `${t.importOne} ${skill.name}`
                }, (0, import_react.createElement)(IconBolt, { size: 12 }), t.importBtn)
              ))
            ) : null
          );
        })
      ),
      (0, import_react.createElement)(
        "div",
        { className: "dsh-as-toolbar" },
        (0, import_react.createElement)("input", {
          className: "dsh-as-input",
          value: localPath,
          onChange: (event) => setLocalPath(event.currentTarget.value),
          placeholder: t.importPlaceholder,
          "aria-label": t.localDirAria
        }),
        (0, import_react.createElement)("button", {
          type: "button",
          className: "dsh-as-btn2 dsh-as-primary",
          disabled: busy || localPath.trim() === "",
          onClick: () => void importLocal()
        }, t.importBtn)
      )
    ),
    (0, import_react.createElement)(
      "section",
      { className: "dsh-as-card" },
      (0, import_react.createElement)("h3", null, t.installTitle),
      (0, import_react.createElement)("p", { className: "dsh-as-sub" }, t.installSub),
      (0, import_react.createElement)(
        "div",
        { className: "dsh-as-toolbar" },
        (0, import_react.createElement)("input", {
          className: "dsh-as-input",
          value: remoteInput,
          onChange: (event) => setRemoteInput(event.currentTarget.value),
          placeholder: t.installPlaceholder,
          "aria-label": t.installInputAria
        }),
        (0, import_react.createElement)("button", {
          type: "button",
          className: "dsh-as-btn2 dsh-as-primary",
          disabled: busy || remoteInput.trim() === "",
          onClick: () => void installRemote(),
          style: { minWidth: 84 }
        }, busy ? (0, import_react.createElement)(IconRefresh, { size: 12, spin: true }) : null, busy ? t.importing : t.installBtn)
      )
    )
  );
}
function guessSourceType(value) {
  const s = value.trim();
  if (s.includes("/") || s.startsWith("git@") || /^https?:\/\/github\.com\//i.test(s)) return "github";
  return "npm";
}
function apply(ctx) {
  ensureStyles();
  const slots = ctx.slots;
  if (slots === void 0) {
    console.warn(`[${NS}] slots service unavailable; skipping UI registration`);
    return;
  }
  ctx.effect?.(
    () => slots.inject(
      "conversation.input.right",
      () => slots.register(
        { name: "conversation.input.right", id: "any-skills-picker", order: 100, label: "Skill picker" },
        SkillPickerButton
      )
    ),
    `${NS}: composer skill picker`
  );
  ctx.effect?.(
    () => slots.inject(
      "settings.section",
      () => slots.register(
        {
          name: "settings.section",
          id: "skills",
          order: 35,
          label: "Skill \u7BA1\u7406"
        },
        SkillsSettingsSection
      )
    ),
    `${NS}: settings section`
  );
}
function messageOf(reason) {
  return reason instanceof Error ? reason.message : String(reason);
}
return module.exports; } });
