# dsh-any-skills

> Import, install and invoke Agent Skills in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) from **Codex / Claude Code / OpenCode / GitHub / npm** — with a ⚡ composer-side skill picker and a **Skill 管理** settings page.
>
> 从 Codex / Claude Code / OpenCode / GitHub / npm 导入并安装技能（Agent Skills）到 `~/.dsh/skills`，支持在对话框旁一键插入 `/技能名` 调用，并在设置页提供完整的技能管理界面。

![dsh-plugin](https://img.shields.io/badge/dsh-plugin-%40deepseek--ai%2Fdsh-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## 功能特性 / Features

- **技能导入（Import）**
  - Codex：`~/.codex/skills`、项目 `.codex/skills`
  - Claude Code：`~/.claude/skills`、项目 `.claude/skills`
  - OpenCode：项目 `.opencode/skills`、`.agents/skills`
  - GitHub 仓库：`owner/repo`、HTTPS URL、SSH URL（`git@github.com:…`）、Git URL（`ssh://git@github.com/…`）
  - 本机目录：任意包含 `SKILL.md` 的目录或 `.md` 技能文件
- **技能安装（Install）**
  - GitHub：下载 codeload tarball 并提取（参考 dsh-skill-market 的实现，无需 git 二进制）
  - npm：通过 registry API 解析包 tarball 并提取
  - 支持批量安装（空格 / 逗号 / 分号分隔）
- **对话中调用（Invoke）**
  - composer 旁 ⚡ 按钮 → 弹出可搜索的技能列表 → 选择后向输入框插入 `/skill-name`（DSH 原生用户调用手势，随消息一起加载技能）
- **设置页（Settings）**：`设置 → Skill 管理`，列出已安装技能、卸载、按来源导入、GitHub/npm 安装

所有导入/安装的技能写入 `~/.dsh/skills/`（可配置）。这是 DSH 原生技能提供器（`dsh-skill-filesystem`）的 `user-dsh` 根目录，会自动被监听 —— **无需任何额外注册**，模型即可读取新技能，`/skill-name` 手势立即可用。

## 安装 / Installation

```bash
# 从 Git 在线安装（推荐，已实测通过）：
dsh plugin --profile web add "github:wmengxiang/dsh-any-skills#main"
```

```bash
# 或从插件源码目录（本仓库 checkout）安装到 web profile：
cd dsh-any-skills
dsh plugin --profile web add .
# dsh 会自动把带 dsh.bundle 声明的包加入 dsh.profile.bundles 层
```

安装后重启 `dsh web` 即可生效。

> **说明**：安装时的 `missing peer @deepseek-ai/cordis@^4.0.1` 警告是正常的 —— 与
> profile 里其它 dsh 插件（dshmarket、dsh-at-file 等）一致，cordis 由 DSH 安装
> 自身提供，无需单独安装。`Ignored build scripts: esbuild` 同样无害：仓库已提交
> 构建产物（`index.js` / `client.js`），`prepare` 的重新构建只是冗余保障。

## 使用 / Usage

### 1. Composer ⚡ 技能选择器

在对话输入框右侧（发送按钮旁）有一个 ⚡ 按钮：

1. 点击打开技能选择弹窗，展示 `~/.dsh/skills` 下所有已安装技能（名称 + 描述）
2. 顶部搜索框可过滤技能（按名称/描述，支持最近使用优先排序）
3. 选择技能后自动在输入框插入 `/skill-name` 并附带空格 —— 发送消息时 DSH 会加载该技能

### 2. 设置页 Skill 管理

`设置（左下角齿轮）→ Skill 管理`：

- **⚡ 按钮开关**：可在设置页开启/关闭对话输入框旁的 ⚡ 技能选择按钮（默认开启；关闭后仍可用 `/技能名` 直接调用）
- **已安装技能**：列出所有已安装技能，支持**搜索过滤**（按技能名/说明实时筛选）；「已安装技能」与「导入」卡片均可点击头部**折叠/展开**（状态记忆）；可单个卸载（移入 `.trash-<时间戳>-<名称>`，可手动恢复）；卸载后提示中包含回收目录名、一键「恢复」按钮与 `mv` 手动恢复命令
- **导入**：自动检测 Codex / Claude Code / OpenCode 的用户级与项目级技能目录，每行显示**绝对路径**与**技能数量**；点击行可**展开**查看每个技能的详情（名称/描述/路径/已安装标记），支持「导入全部」或对单个技能单独导入；也支持输入本机目录路径直接导入
- **安装**：输入 GitHub 仓库（`owner/repo` 或完整 URL）或 npm 包名，支持批量；安装过程中按钮禁用并显示加载动画，防止重复操作

### 3. HTTP API

Host 端在 DSH webServer 上注册同源 JSON API（浏览器端 UI 即调用此 API）：

| Method | Path | Body | 说明 |
| --- | --- | --- | --- |
| GET | `/api/skills/list` | – | 列出已安装技能 |
| GET | `/api/skills/sources?cwd=…` | – | 检测 Codex/Claude/OpenCode 可导入技能 |
| POST | `/api/skills/import` | `{type, path?, repository?, sourceId?, cwd?, names?}` | 导入（type: codex/claude/opencode/local/github；`names` 可只导入指定技能） |
| POST | `/api/skills/install` | `{sources: [{type: 'github'\|'npm', value}]}` | 批量安装 |
| DELETE | `/api/skills/uninstall` | `{name}` | 卸载（返回 `trash` 回收目录名；移入 .trash） |
| POST | `/api/skills/restore` | `{name, trash}` | 从 .trash 恢复技能 |

可变端点带有同源（same-origin）校验。

## 技能格式 / Skill format

导入要求（与 DSH 原生格式一致）：

```
<skill-name>/
└── SKILL.md
```

`SKILL.md` 必须以 YAML frontmatter 开头，至少包含：

```markdown
---
name: my-skill          # 必须：^[a-z0-9]+(?:-[a-z0-9]+)*$（kebab-case）
description: 一句话描述
---
技能正文……
```

- 也支持扁平格式 `<skill-name>.md`
- 导入时名称会自动规范化为 kebab-case（大写转小写、下划线转连字符等）
- frontmatter 可选字段：`whenToUse`、`disable-model-invocation`、`user-invocable`、`metadata`

### 多语言说明（跟随应用语言） / Localized descriptions

列表与 ⚡ 选择器中的技能说明会**跟随 DSH 应用语言**（设置 → General → Language，zh/en）自动切换。技能作者可按需补充按语言区分的字段（缺省回退到 `description` / `whenToUse`）：

```markdown
---
name: my-skill
description: One-line summary.
description_zh: 一句话中文说明。
description_en: One-line summary (en).
whenToUse: Use when the user asks about X.
whenToUse_zh: 当用户询问 X 时使用。
whenToUse_en: Use when the user asks about X (en).
---
```

- 未提供对应语言字段时，显示原始 `description` / `whenToUse`（向后兼容所有现有技能）
- 插件的自身界面文案（按钮/标签/提示）也随应用语言在 zh/en 间切换

## 配置 / Configuration

可通过 profile 的 `cordis.patch.yml` 覆盖插件配置：

```yaml
- config:
    - id: dsh-any-skills
      config:
        installDir: /path/to/custom/skills   # 默认 ~/.dsh/skills
        githubToken: ''                       # 可选：GitHub API 令牌
        githubTokenFile: ''                   # 可选：令牌文件路径（也可用环境变量 GITHUB_TOKEN）
```

## 开发与测试 / Development

```bash
pnpm install          # 安装 devDependencies
pnpm typecheck        # tsc --noEmit
pnpm test             # build + node --test（16 个单元测试：frontmatter/名称/仓库解析/文件系统流程/API/客户端 bundle）
pnpm build            # esbuild：index.js（Host ESM）+ client.js（Client CJS + __ModuleLoader__ 握手）
```

开发测试：

```bash
# 先把插件装进 profile，再用 dev overlay 启动：
dsh plugin --profile web add .
dsh web --patch ./cordis.dev.yml
```

结构：

```
dsh-any-skills/
├── package.json          # dsh.bundle.patch + dsh.client 声明
├── cordis.patch.yml      # 组合层 patch（insert 插件行）
├── cordis.dev.yml        # 开发用 overlay
├── build.mjs             # esbuild 构建脚本
├── index.ts              # Host 端：/api/skills/* 路由 + 技能管理逻辑
├── client.ts             # Client 端：⚡ 按钮 + 技能选择弹窗 + Skill 管理设置页
├── src/
│   ├── skills.ts         # 核心：frontmatter 解析、名称规范化、扫描/复制/卸载
│   └── remote.ts         # GitHub / npm tarball 解析与安装
└── test/                 # node:test 单元测试
```

## 参考实现 / References

- [dsh-skills-manager](https://github.com/Xichun123/dsh-skills-manager) — settings 侧边栏 + composer wrench 控件设计
- [dsh-skill-market](https://github.com/QQ-M/dsh-skill-market) — GitHub tarball 安装到 `~/.dsh/skills`
- [dsh-skill-picker](https://github.com/a735624258/dsh-skill-picker) — composer 旁可搜索技能选择器

## 常见问题 / FAQ

**导入/安装后模型看不到新技能？**

`~/.dsh/skills` 由 DSH 原生技能提供器（`dsh-skill-filesystem`）自动监听，
无需重启即可被模型读取；极少数情况下需要等 1–2 秒或在新会话中生效。

**⚡ 按钮不见了？**

设置 → Skill 管理 → 「在对话输入框旁显示 ⚡ 技能选择按钮」被关闭了；打开即可。
关闭时仍可手动输入 `/技能名` 调用。

**卸载错了，怎么手动恢复？**

卸载会把技能移入 `~/.dsh/skills/.trash-<时间戳>-<名称>`，界面上一键「恢复」即可；
手动方式：`mv ~/.dsh/skills/.trash-<时间戳>-<名称> ~/.dsh/skills/<名称>`。

**安装时提示 `missing peer @deepseek-ai/cordis` 警告？**

正常现象，所有 dsh 插件一致——cordis 由 DSH 安装自身提供，无需单独安装。

**如何更新插件到最新版？**

```bash
dsh plugin --profile web update dsh-any-skills
```

## License

MIT
