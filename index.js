// index.ts
import { readFile as readFile2 } from "node:fs/promises";
import { resolve as resolve2 } from "node:path";

// src/skills.ts
import { cp, mkdir, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
var SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function dshHome() {
  const env = process.env.DSH_HOME;
  return env !== void 0 && env !== "" ? resolve(env) : join(homedir(), ".dsh");
}
function defaultInstallDir() {
  return join(dshHome(), "skills");
}
function normalizeSkillName(raw) {
  const s = String(raw ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s;
}
function isValidSkillName(name2) {
  return SKILL_NAME_RE.test(name2);
}
function parseSkillText(raw) {
  if (typeof raw !== "string") return void 0;
  const firstLineEnd = raw.indexOf("\n");
  if (firstLineEnd < 0) return void 0;
  if (raw.slice(0, firstLineEnd).replace(/\r$/, "") !== "---") return void 0;
  const start = firstLineEnd + 1;
  const closing = findClosingFrontmatter(raw, start);
  if (closing === void 0) return void 0;
  let data;
  try {
    data = parseYaml(raw.slice(start, closing.start));
  } catch {
    return void 0;
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return void 0;
  const record = data;
  const name2 = stringField(record, "name");
  const description = stringField(record, "description");
  if (name2 === void 0 || description === void 0) return void 0;
  if (!isValidSkillName(name2)) return void 0;
  const whenToUse = optionalString(record, "whenToUse");
  const descriptionZh = optionalString(record, "description_zh");
  const descriptionEn = optionalString(record, "description_en");
  const whenToUseZh = optionalString(record, "whenToUse_zh");
  const whenToUseEn = optionalString(record, "whenToUse_en");
  return {
    name: name2,
    description,
    ...whenToUse !== void 0 ? { whenToUse } : {},
    ...descriptionZh !== void 0 ? { descriptionZh } : {},
    ...descriptionEn !== void 0 ? { descriptionEn } : {},
    ...whenToUseZh !== void 0 ? { whenToUseZh } : {},
    ...whenToUseEn !== void 0 ? { whenToUseEn } : {},
    body: raw.slice(closing.bodyStart).trim()
  };
}
function findClosingFrontmatter(raw, start) {
  let lineStart = start;
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf("\n", lineStart);
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline;
    if (raw.slice(lineStart, lineEnd).replace(/\r$/, "") === "---") {
      return { start: lineStart, bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1 };
    }
    if (nextNewline < 0) return void 0;
    lineStart = nextNewline + 1;
  }
  return void 0;
}
function stringField(data, key) {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function optionalString(data, key) {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isErrno(error, "ENOENT")) return false;
    throw error;
  }
}
async function isDirectory(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (isErrno(error, "ENOENT")) return false;
    throw error;
  }
}
function isErrno(error, code) {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}
async function readSkillDoc(mdPath) {
  let raw;
  try {
    raw = await readFile(mdPath, "utf8");
  } catch (error) {
    if (isErrno(error, "ENOENT")) return void 0;
    throw error;
  }
  return parseSkillText(raw);
}
async function scanDirectory(root) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (isErrno(error, "ENOENT") || isErrno(error, "ENOTDIR")) return [];
    throw error;
  }
  const found = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      const parsed = await readSkillDoc(join(entryPath, "SKILL.md"));
      if (parsed === void 0) continue;
      found.push(toSummary(parsed, entryPath, "bundle"));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const parsed = await readSkillDoc(entryPath);
      if (parsed === void 0) continue;
      found.push(toSummary(parsed, entryPath, "flat"));
    }
  }
  return found;
}
function toSummary(parsed, path, kind) {
  return {
    name: parsed.name,
    description: parsed.description,
    ...parsed.descriptionZh !== void 0 ? { descriptionZh: parsed.descriptionZh } : {},
    ...parsed.descriptionEn !== void 0 ? { descriptionEn: parsed.descriptionEn } : {},
    ...parsed.whenToUse !== void 0 ? { whenToUse: parsed.whenToUse } : {},
    ...parsed.whenToUseZh !== void 0 ? { whenToUseZh: parsed.whenToUseZh } : {},
    ...parsed.whenToUseEn !== void 0 ? { whenToUseEn: parsed.whenToUseEn } : {},
    path,
    kind
  };
}
async function listInstalled(installDir) {
  return scanDirectory(installDir);
}
async function installBundleDir(sourceDir, installDir) {
  const parsed = await readSkillDoc(join(sourceDir, "SKILL.md"));
  if (parsed === void 0) {
    throw new Error(`not a skill: ${sourceDir} (missing valid SKILL.md with name/description frontmatter)`);
  }
  const target = join(installDir, parsed.name);
  await mkdir(installDir, { recursive: true });
  await rm(target, { recursive: true, force: true });
  await cp(sourceDir, target, {
    recursive: true,
    force: true,
    filter: (src) => {
      const base = basename(src);
      return base !== ".git" && base !== ".gitignore" && base !== ".DS_Store";
    }
  });
  return toSummary(parsed, target, "bundle");
}
async function installFlatFile(sourceFile, installDir, name2) {
  const parsed = await readSkillDoc(sourceFile);
  if (parsed === void 0) {
    throw new Error(`not a skill: ${sourceFile} (missing valid frontmatter with name/description)`);
  }
  const targetName = name2 ?? parsed.name;
  const target = join(installDir, `${targetName}.md`);
  await mkdir(installDir, { recursive: true });
  await rm(target, { force: true });
  await cp(sourceFile, target, { force: true });
  return toSummary(parsed, target, "flat");
}
async function installAllFromRoot(root, installDir) {
  const found = await scanDirectory(root);
  const installed = [];
  for (const skill of found) {
    if (skill.kind === "bundle") {
      installed.push(await installBundleDir(skill.path, installDir));
    } else {
      installed.push(await installFlatFile(skill.path, installDir));
    }
  }
  return installed;
}
async function uninstallSkill(installDir, name2) {
  if (!/^[\w.-]+$/.test(name2)) return { ok: false, message: `\u975E\u6CD5\u6280\u80FD\u540D: ${name2}` };
  const target = join(installDir, name2);
  if (!await pathExists(target)) return { ok: false, message: `\u672A\u627E\u5230\u5DF2\u5B89\u88C5\u7684\u6280\u80FD: ${name2}` };
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const trash = join(installDir, `.trash-${ts}-${name2}`);
  await rename(target, trash);
  return { ok: true, message: `\u5DF2\u5378\u8F7D ${name2}\uFF08\u79FB\u5165 ${basename(trash)}\uFF0C\u53EF\u624B\u52A8\u6062\u590D\uFF09`, trash: basename(trash) };
}
async function restoreSkill(installDir, name2, trash) {
  if (!isValidSkillName(name2)) return { ok: false, message: `\u975E\u6CD5\u6280\u80FD\u540D: ${name2}` };
  if (!/^\.trash-\d{14}-[\w.-]+$/.test(trash)) return { ok: false, message: `\u975E\u6CD5\u56DE\u6536\u76EE\u5F55\u540D: ${trash}` };
  if (!trash.endsWith(`-${name2}`)) return { ok: false, message: `\u56DE\u6536\u76EE\u5F55\u4E0E\u6280\u80FD\u540D\u4E0D\u5339\u914D: ${trash} / ${name2}` };
  const trashPath = join(installDir, trash);
  if (!await pathExists(trashPath)) return { ok: false, message: `\u672A\u627E\u5230\u56DE\u6536\u76EE\u5F55: ${trash}` };
  const target = join(installDir, name2);
  await rm(target, { recursive: true, force: true });
  await rename(trashPath, target);
  return { ok: true, message: `\u5DF2\u6062\u590D ${name2}\uFF08\u4ECE ${trash} \u79FB\u56DE\u5B89\u88C5\u76EE\u5F55\uFF09` };
}
async function findProjectRoot(cwd) {
  let current = resolve(cwd);
  for (; ; ) {
    if (await pathExists(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(cwd);
    current = parent;
  }
}
async function detectSources(cwd, installDir = defaultInstallDir()) {
  const projectRoot = await findProjectRoot(cwd);
  const home = homedir();
  const candidates = [
    { id: "codex-user", label: "Codex\uFF08\u7528\u6237\u7EA7\uFF09~/.codex/skills", tool: "codex", path: join(home, ".codex", "skills") },
    { id: "codex-project", label: "Codex\uFF08\u9879\u76EE\u7EA7\uFF09.codex/skills", tool: "codex", path: join(projectRoot, ".codex", "skills") },
    { id: "claude-user", label: "Claude Code\uFF08\u7528\u6237\u7EA7\uFF09~/.claude/skills", tool: "claude", path: join(home, ".claude", "skills") },
    { id: "claude-project", label: "Claude Code\uFF08\u9879\u76EE\u7EA7\uFF09.claude/skills", tool: "claude", path: join(projectRoot, ".claude", "skills") },
    { id: "opencode-project", label: "OpenCode\uFF08\u9879\u76EE\u7EA7\uFF09.opencode/skills", tool: "opencode", path: join(projectRoot, ".opencode", "skills") },
    { id: "agents-project", label: "OpenCode\uFF08\u9879\u76EE\u7EA7\uFF09.agents/skills", tool: "opencode", path: join(projectRoot, ".agents", "skills") }
  ];
  const installed = new Set((await listInstalled(installDir)).map((s) => s.name));
  const groups = [];
  for (const candidate of candidates) {
    const exists = await isDirectory(candidate.path);
    const skills = exists ? await scanDirectory(candidate.path) : [];
    for (const skill of skills) skill.installed = installed.has(skill.name);
    groups.push({ ...candidate, exists, skills });
  }
  return groups;
}

// src/remote.ts
import { execFile } from "node:child_process";
import { mkdtemp, readdir as readdir2, rm as rm2, stat as stat2, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join as join2 } from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var GH_API = "https://api.github.com";
var GH_CLONE = "https://github.com";
var CODELOAD = "https://codeload.github.com";
var NPM_REGISTRY = "https://registry.npmjs.org";
var USER_AGENT = "dsh-any-skills/0.1.0";
var SPARSE_EXCLUSIONS = [
  "/assets/",
  "/docs/",
  "/docs-site/",
  "/marketplace/",
  "/public/",
  "/static/",
  "/media/",
  "/images/",
  "/img/",
  "/video/",
  "/videos/",
  "/node_modules/",
  "/dist/",
  "/build/",
  "/target/",
  "/vendor/",
  "/demo/",
  "/gifs/",
  "/screenshots/"
];
var REPO_NAME_RE = /^[A-Za-z0-9_.-]+$/;
function parseRepoInput(input) {
  const raw = String(input ?? "").trim();
  if (raw === "") return void 0;
  let ref;
  let body = raw;
  const hashIndex = body.indexOf("#");
  if (hashIndex >= 0) {
    ref = body.slice(hashIndex + 1) || void 0;
    body = body.slice(0, hashIndex);
  }
  body = body.replace(/\.git$/, "");
  if (/^ssh:\/\//i.test(body)) {
    try {
      const url = new URL(body);
      if (url.hostname !== "github.com") return void 0;
      const parts2 = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      if (parts2.length < 2) return void 0;
      const [owner2, repo2] = parts2;
      if (!REPO_NAME_RE.test(owner2) || !REPO_NAME_RE.test(repo2)) return void 0;
      return ref !== void 0 ? { owner: owner2, repo: repo2, ref } : { owner: owner2, repo: repo2 };
    } catch {
      return void 0;
    }
  }
  const scp = /^[^/@\s]+@([^:/\s]+):(.+)$/.exec(body);
  if (scp !== null) {
    if (scp[1] !== "github.com") return void 0;
    const parts2 = scp[2].split("/").filter(Boolean);
    if (parts2.length < 2) return void 0;
    const [owner2, repo2] = parts2;
    if (!REPO_NAME_RE.test(owner2) || !REPO_NAME_RE.test(repo2)) return void 0;
    return ref !== void 0 ? { owner: owner2, repo: repo2, ref } : { owner: owner2, repo: repo2 };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(body)) {
    try {
      const url = new URL(body);
      if (!/^https?:$/.test(url.protocol)) return void 0;
      if (url.hostname !== "github.com") return void 0;
      const parts2 = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
      if (parts2.length < 2) return void 0;
      const [owner2, repo2] = parts2;
      if (!REPO_NAME_RE.test(owner2) || !REPO_NAME_RE.test(repo2)) return void 0;
      return ref !== void 0 ? { owner: owner2, repo: repo2, ref } : { owner: owner2, repo: repo2 };
    } catch {
      return void 0;
    }
  }
  const parts = body.split("/").filter(Boolean);
  if (parts.length < 2) return void 0;
  const [owner, repo] = parts;
  if (!REPO_NAME_RE.test(owner) || !REPO_NAME_RE.test(repo)) return void 0;
  return ref !== void 0 ? { owner, repo, ref } : { owner, repo };
}
async function inspectRepo(owner, repo, token) {
  const headers = { "User-Agent": USER_AGENT, Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}`, { headers, signal: AbortSignal.timeout(2e4) });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`GitHub \u4ED3\u5E93\u4E0D\u5B58\u5728: ${owner}/${repo}`);
    throw new Error(`GitHub API ${res.status}\uFF08\u4ED3\u5E93\u53EF\u80FD\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u9650\u6D41\uFF09`);
  }
  const data = await res.json();
  return {
    defaultBranch: data.default_branch ?? "main",
    description: data.description ?? ""
  };
}
var DOWNLOAD_TIMEOUT_MS = 3e5;
var DOWNLOAD_RETRIES = 2;
var GIT_TIMEOUT_MS = 3e5;
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
async function gitCloneSparse(owner, repo, ref) {
  const tmp = await mkdtemp(join2(tmpdir(), "dsh-any-skills-"));
  const url = `${GH_CLONE}/${owner}/${repo}.git`;
  try {
    await execFileAsync("git", ["clone", "--depth", "1", "--filter=blob:none", "--sparse", "--single-branch", "--branch", ref, url, tmp], {
      stdio: "ignore",
      timeout: GIT_TIMEOUT_MS
    });
    const patterns = ["/*", ...SPARSE_EXCLUSIONS.map((ex) => `!${ex}`)];
    await execFileAsync("git", ["-C", tmp, "sparse-checkout", "set", "--no-cone", ...patterns], {
      stdio: "ignore",
      timeout: GIT_TIMEOUT_MS
    });
    await execFileAsync("git", ["-C", tmp, "checkout"], {
      stdio: "ignore",
      timeout: GIT_TIMEOUT_MS
    });
    return {
      root: tmp,
      cleanup: () => rm2(tmp, { recursive: true, force: true })
    };
  } catch (error) {
    await rm2(tmp, { recursive: true, force: true });
    throw new Error(`\u514B\u9686 ${owner}/${repo} \u5931\u8D25\uFF08\u7F51\u7EDC\u6216\u4ED3\u5E93\u4E0D\u53EF\u7528\uFF09\uFF1A${errorMessage(error)}`);
  }
}
async function downloadTarball(url, label, destination) {
  let lastError;
  for (let attempt = 0; attempt <= DOWNLOAD_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`\u4E0B\u8F7D ${label} \u5931\u8D25: HTTP ${res.status}`);
      await writeFile(destination, Buffer.from(await res.arrayBuffer()));
      return;
    } catch (error) {
      lastError = error;
      const isTimeout = error instanceof Error && (error.name === "AbortError" || /timeout/i.test(error.message));
      if (attempt < DOWNLOAD_RETRIES) {
        await new Promise((resolve3) => setTimeout(resolve3, 1500 * (attempt + 1)));
        continue;
      }
      if (isTimeout) {
        throw new Error(`\u4E0B\u8F7D ${label} \u8D85\u65F6\uFF08\u4ED3\u5E93\u8F83\u5927\u6216\u7F51\u7EDC\u8F83\u6162\uFF09\uFF0C\u5DF2\u91CD\u8BD5 ${DOWNLOAD_RETRIES} \u6B21\u4ECD\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5`);
      }
      throw error;
    }
  }
  throw lastError;
}
async function downloadAndExtract(url, label) {
  const tmp = await mkdtemp(join2(tmpdir(), "dsh-any-skills-"));
  const tarballPath = join2(tmp, "src.tar.gz");
  try {
    await downloadTarball(url, label, tarballPath);
    await execFileAsync("tar", ["-xzf", tarballPath, "-C", tmp], {
      stdio: "ignore",
      timeout: DOWNLOAD_TIMEOUT_MS
    });
    const entries = (await readdir2(tmp)).filter((n) => n !== "src.tar.gz");
    const root = entries.length === 1 ? join2(tmp, entries[0]) : tmp;
    return {
      root,
      cleanup: () => rm2(tmp, { recursive: true, force: true })
    };
  } catch (error) {
    await rm2(tmp, { recursive: true, force: true });
    throw error;
  }
}
async function installSkillsFromTree(root, installDir, defaultName) {
  const installed = [];
  const seen = /* @__PURE__ */ new Set();
  const seenDirectories = /* @__PURE__ */ new Set();
  const push = async (skillPath, kind, name2) => {
    if (kind === "bundle") {
      const canonical = skillPath;
      if (seenDirectories.has(canonical)) return;
      const parsed = await readSkillDoc(join2(canonical, "SKILL.md"));
      if (parsed === void 0) return;
      if (seen.has(parsed.name)) return;
      seen.add(parsed.name);
      seenDirectories.add(canonical);
      installed.push(await installBundleDir(canonical, installDir));
    } else {
      const parsed = await readSkillDoc(skillPath);
      if (parsed === void 0) return;
      const targetName = name2 ?? parsed.name;
      if (seen.has(targetName)) return;
      seen.add(targetName);
      installed.push(await installFlatFile(skillPath, installDir, targetName));
    }
  };
  const rootSkill = join2(root, "SKILL.md");
  if (await existsFile(rootSkill)) {
    const parsed = await readSkillDoc(rootSkill);
    if (parsed !== void 0) {
      await push(root, "bundle", defaultName);
      return installed;
    }
  }
  const pushCollection = async (dir) => {
    if (!await existsDirectory(dir)) return;
    for (const entry of (await readdir2(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".")) continue;
      const entryPath = join2(dir, entry.name);
      if (entry.isDirectory()) await push(entryPath, "bundle");
      else if (entry.isFile() && entry.name.endsWith(".md")) await push(entryPath, "flat");
    }
  };
  for (const dir of ["skills", ".agents/skills", ".claude/skills", ".codex/skills"]) {
    await pushCollection(join2(root, dir));
  }
  for (const entry of (await readdir2(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".") || entry.name === "skills") continue;
    const entryPath = join2(root, entry.name);
    if (entry.isDirectory()) {
      await push(entryPath, "bundle");
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      await push(entryPath, "flat");
    }
  }
  return installed;
}
async function installFromGitHub(input, installDir, token) {
  const parsed = parseRepoInput(input);
  if (parsed === void 0) {
    throw new Error("\u65E0\u6548\u7684 GitHub \u4ED3\u5E93\u5730\u5740\uFF08\u652F\u6301 owner/repo\u3001HTTPS URL\u3001SSH URL \u6216 Git URL\uFF09");
  }
  const meta = await inspectRepo(parsed.owner, parsed.repo, token);
  const branch = parsed.ref ?? meta.defaultBranch;
  let root;
  let cleanup;
  let cloneError = void 0;
  try {
    const cloned = await gitCloneSparse(parsed.owner, parsed.repo, branch);
    root = cloned.root;
    cleanup = cloned.cleanup;
  } catch (error) {
    cloneError = error;
    try {
      const tarballUrl = `${CODELOAD}/${parsed.owner}/${parsed.repo}/tar.gz/${encodeURIComponent(branch)}`;
      const downloaded = await downloadAndExtract(tarballUrl, `${parsed.owner}/${parsed.repo}`);
      root = downloaded.root;
      cleanup = downloaded.cleanup;
    } catch (tarballError) {
      throw new Error(`\u514B\u9686 ${parsed.owner}/${parsed.repo} \u5931\u8D25\uFF1A${errorMessage(cloneError)}\uFF1Btarball \u56DE\u9000\u4E5F\u5931\u8D25\uFF1A${errorMessage(tarballError)}`);
    }
  }
  try {
    const installed = await installSkillsFromTree(root, installDir, normalizeSkillName(parsed.repo));
    if (installed.length === 0) {
      throw new Error("\u8BE5\u4ED3\u5E93\u91CC\u6CA1\u6709\u627E\u5230 SKILL.md\uFF0C\u770B\u8D77\u6765\u4E0D\u662F\u6280\u80FD\u4ED3\u5E93");
    }
    return { repo: `${parsed.owner}/${parsed.repo}`, branch, installed };
  } finally {
    await cleanup();
  }
}
function parseNpmSpec(spec) {
  const raw = String(spec ?? "").trim();
  if (raw === "") return void 0;
  let name2;
  let version;
  if (raw.startsWith("@")) {
    const at = raw.indexOf("@", 1);
    if (at < 0) {
      name2 = raw;
    } else {
      name2 = raw.slice(0, at);
      version = raw.slice(at + 1);
    }
  } else {
    const at = raw.indexOf("@");
    if (at < 0) {
      name2 = raw;
    } else {
      name2 = raw.slice(0, at);
      version = raw.slice(at + 1);
    }
  }
  if (name2 === "" || !/^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name2)) return void 0;
  return version !== void 0 && version !== "" ? { name: name2, version } : { name: name2 };
}
async function npmTarball(name2, version) {
  const encoded = name2.startsWith("@") ? name2.replace("/", "%2F") : name2;
  const url = `${NPM_REGISTRY}/${encoded}`;
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.npm.install-v1+json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(3e4)
  });
  if (!res.ok) throw new Error(`npm \u5305\u4E0D\u5B58\u5728: ${name2}\uFF08HTTP ${res.status}\uFF09`);
  const data = await res.json();
  const resolvedVersion = version ?? data["dist-tags"]?.latest;
  const entry = resolvedVersion !== void 0 ? data.versions?.[resolvedVersion] : void 0;
  const tarball = entry?.dist?.tarball ?? data.dist?.tarball;
  if (typeof tarball !== "string" || tarball === "") {
    throw new Error(`npm \u5305\u6CA1\u6709\u53EF\u4E0B\u8F7D\u7684 tarball: ${name2}${version !== void 0 ? `@${version}` : ""}`);
  }
  return {
    url: tarball,
    resolvedVersion: resolvedVersion ?? "latest",
    description: entry?.description ?? data.description ?? ""
  };
}
async function installFromNpm(spec, installDir) {
  const parsed = parseNpmSpec(spec);
  if (parsed === void 0) throw new Error(`\u65E0\u6548\u7684 npm \u5305\u540D: ${spec}`);
  const { url, resolvedVersion } = await npmTarball(parsed.name, parsed.version);
  const { root, cleanup } = await downloadAndExtract(url, `npm:${parsed.name}`);
  try {
    const installed = await installSkillsFromTree(root, installDir, normalizeSkillName(parsed.name));
    if (installed.length === 0) {
      throw new Error(`npm \u5305 ${parsed.name} \u91CC\u6CA1\u6709\u627E\u5230 SKILL.md\uFF0C\u770B\u8D77\u6765\u4E0D\u662F\u6280\u80FD\u5305`);
    }
    return { package: parsed.name, version: resolvedVersion, installed };
  } finally {
    await cleanup();
  }
}
async function existsFile(path) {
  try {
    return (await stat2(path)).isFile();
  } catch {
    return false;
  }
}
async function existsDirectory(path) {
  try {
    return (await stat2(path)).isDirectory();
  } catch {
    return false;
  }
}

// index.ts
var name = "dsh-any-skills";
var inject = ["webServer"];
async function resolveGithubToken(config) {
  if (config?.githubToken && config.githubToken !== "") return config.githubToken;
  if (config?.githubTokenFile && config.githubTokenFile !== "") {
    try {
      const value = (await readFile2(resolve2(config.githubTokenFile), "utf8")).trim();
      if (value !== "") return value;
    } catch {
    }
  }
  return process.env.GITHUB_TOKEN ?? "";
}
function apply(ctx, config) {
  const webServer = ctx.webServer;
  if (webServer === void 0) return;
  const installDir = resolve2(config?.installDir ?? defaultInstallDir());
  const handler = (req, res) => {
    return (async () => {
      const token = await resolveGithubToken(config);
      await handleApi(req, res, installDir, token);
    })();
  };
  ctx.effect?.(
    () => webServer.register({ kind: "prefix", path: "/api/skills", handler }),
    "dsh-any-skills: api routes"
  );
  ctx.logger?.info?.(`dsh-any-skills: API ready at /api/skills/* (installDir=${installDir})`);
}
async function handleApi(req, res, installDir, token) {
  let url;
  try {
    url = new URL(req.url ?? "/", "http://localhost");
  } catch {
    return sendJson(res, 400, { ok: false, message: "invalid url" });
  }
  const { pathname } = url;
  try {
    if (req.method === "GET" && pathname === "/api/skills/list") {
      const skills = await listInstalled(installDir);
      return sendJson(res, 200, { ok: true, installDir, skills });
    }
    if (req.method === "GET" && pathname === "/api/skills/sources") {
      const cwd = url.searchParams.get("cwd") || process.cwd();
      const groups = await detectSources(cwd, installDir);
      return sendJson(res, 200, { ok: true, cwd, sources: groups });
    }
    if (req.method === "POST" && pathname === "/api/skills/import") {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: "untrusted origin" });
      const body = await readJsonBody(req);
      return sendJson(res, 200, await importSkills(body, installDir, token));
    }
    if (req.method === "POST" && pathname === "/api/skills/install") {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: "untrusted origin" });
      const body = await readJsonBody(req);
      return sendJson(res, 200, await installRemote(body, installDir, token));
    }
    if (req.method === "DELETE" && pathname === "/api/skills/uninstall") {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: "untrusted origin" });
      const body = await readJsonBody(req);
      const name2 = typeof body?.name === "string" ? body.name.trim() : "";
      if (name2 === "") return sendJson(res, 400, { ok: false, message: "name is required" });
      return sendJson(res, 200, await uninstallSkill(installDir, name2));
    }
    if (req.method === "POST" && pathname === "/api/skills/restore") {
      if (!sameOrigin(req)) return sendJson(res, 403, { ok: false, message: "untrusted origin" });
      const body = await readJsonBody(req);
      const name2 = typeof body?.name === "string" ? body.name.trim() : "";
      const trash = typeof body?.trash === "string" ? body.trash.trim() : "";
      if (name2 === "" || trash === "") return sendJson(res, 400, { ok: false, message: "name and trash are required" });
      return sendJson(res, 200, await restoreSkill(installDir, name2, trash));
    }
    sendJson(res, 404, { ok: false, message: "not found" });
  } catch (error) {
    sendJson(res, 500, { ok: false, message: errorMessage2(error) });
  }
}
async function importSkills(body, installDir, token) {
  const type = typeof body?.type === "string" ? body.type : "";
  const cwd = typeof body?.cwd === "string" && body.cwd !== "" ? body.cwd : process.cwd();
  const names = Array.isArray(body?.names) ? body.names.filter((n) => typeof n === "string") : void 0;
  switch (type) {
    case "codex":
    case "claude":
    case "opencode": {
      const sourceId = typeof body?.sourceId === "string" ? body.sourceId : void 0;
      const groups = await detectSources(cwd, installDir);
      const matching = groups.filter((g) => g.tool === type && (sourceId === void 0 || g.id === sourceId));
      const imported = [];
      const skipped = [];
      for (const group of matching) {
        if (!group.exists) continue;
        for (const skill of group.skills) {
          if (names !== void 0 && !names.includes(skill.name)) continue;
          if (skill.installed) {
            skipped.push(skill.name);
            continue;
          }
          imported.push(
            skill.kind === "flat" ? await installFlatFile(skill.path, installDir) : await installBundleDir(skill.path, installDir)
          );
        }
      }
      return { ok: true, imported, ...skipped.length > 0 ? { skipped } : {} };
    }
    case "local": {
      const path = typeof body?.path === "string" ? body.path.trim() : "";
      if (path === "") throw new Error("local import requires a path");
      const sourceDir = resolve2(path);
      if (!await pathExists(sourceDir)) throw new Error(`\u8DEF\u5F84\u4E0D\u5B58\u5728: ${sourceDir}`);
      const imported = await installAllFromRoot(sourceDir, installDir);
      if (imported.length === 0) {
        throw new Error(`\u8DEF\u5F84\u4E2D\u6CA1\u6709\u627E\u5230\u6709\u6548\u7684\u6280\u80FD\uFF08\u9700\u8981\u5305\u542B SKILL.md \u7684\u76EE\u5F55\u6216 .md \u6280\u80FD\u6587\u4EF6\uFF09: ${sourceDir}`);
      }
      return { ok: true, imported };
    }
    case "github": {
      const repository = typeof body?.repository === "string" ? body.repository.trim() : "";
      if (repository === "") throw new Error("github import requires a repository");
      if (parseRepoInput(repository) === void 0) {
        throw new Error("\u65E0\u6548\u7684 GitHub \u4ED3\u5E93\u5730\u5740\uFF08\u652F\u6301 owner/repo\u3001HTTPS URL\u3001SSH URL \u6216 Git URL\uFF09");
      }
      const result = await installFromGitHub(repository, installDir, token);
      return { ok: true, imported: result.installed, source: result.repo, branch: result.branch };
    }
    default:
      throw new Error(`\u672A\u77E5\u7684\u5BFC\u5165\u7C7B\u578B: ${type || "(empty)"}\uFF08\u652F\u6301 codex / claude / opencode / local / github\uFF09`);
  }
}
async function installRemote(body, installDir, token) {
  const sources = Array.isArray(body?.sources) ? body.sources : [];
  if (sources.length === 0) {
    const single = body;
    if (typeof single?.type === "string") {
      const value = typeof single.value === "string" ? single.value : typeof single.repository === "string" ? single.repository : typeof single.package === "string" ? single.package : "";
      if (value !== "") sources.push({ type: single.type, value });
    }
  }
  if (sources.length === 0) throw new Error('install requires sources: [{type: "github"|"npm", value}]');
  const results = [];
  for (const source of sources) {
    const record = typeof source === "object" && source !== null ? source : {};
    const type = typeof record.type === "string" ? record.type : "";
    const value = typeof record.value === "string" ? record.value.trim() : "";
    try {
      if (type === "github") {
        if (value === "") throw new Error("github source requires a value");
        results.push({ source: value, ok: true, ...await installFromGitHub(value, installDir, token) });
      } else if (type === "npm") {
        if (value === "") throw new Error("npm source requires a value");
        results.push({ source: value, ok: true, ...await installFromNpm(value, installDir) });
      } else {
        results.push({ source: value || String(record.type ?? ""), ok: false, message: `\u672A\u77E5\u7684\u5B89\u88C5\u7C7B\u578B: ${type}` });
      }
    } catch (error) {
      results.push({ source: value || String(record.type ?? ""), ok: false, message: errorMessage2(error) });
    }
  }
  return { ok: true, results };
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function readJsonBody(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8").trim();
        resolvePromise(text === "" ? {} : JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
function sendJson(res, status, body) {
  const data = Buffer.from(JSON.stringify(body), "utf8");
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": data.length
  });
  res.end(data);
}
function errorMessage2(error) {
  return error instanceof Error ? error.message : String(error);
}
export {
  DOWNLOAD_RETRIES,
  DOWNLOAD_TIMEOUT_MS,
  SPARSE_EXCLUSIONS,
  apply,
  detectSources,
  downloadTarball,
  gitCloneSparse,
  inject,
  installAllFromRoot,
  installFromGitHub,
  installFromNpm,
  installSkillsFromTree,
  name,
  normalizeSkillName,
  parseNpmSpec,
  parseRepoInput,
  parseSkillText,
  restoreSkill,
  scanDirectory,
  uninstallSkill
};
