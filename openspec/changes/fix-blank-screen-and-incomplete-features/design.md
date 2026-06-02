# Design: 修复黑屏崩溃与补齐未实现功能

> spec-plan 产物。逐文件、零决策技术方案。

## 决策汇总（用户已确认）

| # | 决策 | 选择 |
|---|---|---|
| D1 | 路由 | `HashRouter`（替换 `BrowserRouter`） |
| D2 | persist 兼容 | 一次性清理：`version: 1` + `migrate` 丢弃旧数据回默认 |
| D3 | 占位功能 | 能实现的实现，其余 `disabled` |
| D4 | 部署执行 | 一并加固：async 执行 + token 经 `ZEABUR_TOKEN` env 传入 |

## A. 结构性健壮性

### A1. ErrorBoundary（新增 `src/components/ErrorBoundary/index.tsx`）
- React class 组件，实现 `getDerivedStateFromError` + `componentDidCatch`。
- state: `{ hasError: boolean; message?: string }`。
- fallback：Semi `Empty`/`Card` + `Button`「返回首页」(调用传入的 `onReset` → `navigate('/deploy')` + 清错) 与「重试」(清错重渲染)。
- 因 class 组件无法用 `useNavigate`，采用包装：`ErrorBoundary` 接收 `onReset` 回调；在 `App.tsx` 内用一个函数组件包一层提供 `navigate`。
- 用法：在 `App.tsx` 的 `<Routes>` 外层包 `<ErrorBoundary>`（路由级）；并在 `main.tsx` 顶层再包一层（应用级兜底）。

### A2. 路由（`src/main.tsx`）
- `import { HashRouter } from 'react-router-dom'`，将 `<BrowserRouter>` 替换为 `<HashRouter>`。其余不变。

### A3. persist 一次性清理（`src/store/deploymentStore.ts`）
- persist options 增加 `version: 1`。
- 增加 `migrate: (_persisted, version) => { if (version < 1) return undefined; return _persisted as PersistedDeploymentState }`。
  - 返回 `undefined` 时 zustand 使用初始 state（即默认 config + 空 records），实现"丢弃旧数据"。
- 防御性深合并（兜底，即使同版本）：增加 `merge: (persisted, current) => deepMergeConfig(current, persisted)`，对 `currentConfig` 用默认值回填缺失嵌套键。`deepMergeConfig` 为纯函数，放 `src/utils/configMerge.ts`（新增），供 PBT 测试。

## B. Rust⇄TS 契约对齐（`src-tauri/src/lib.rs` + `src/lib/tauri.ts`）

### B1. `has_secret` 反序列化兜底
- `ZeaburKeyInfoDto.has_secret` 字段加 `#[serde(default)]`，使保存路径（前端不带 `hasSecret`）可成功反序列化。

### B2. 批量存储密钥独立 DTO
- 新增 `#[derive(Deserialize)] #[serde(rename_all="camelCase")] struct BatchStoredDeployEntry { key_id: String, key_name: String }`（无 `api_key`）。
- `deploy_template_batch_with_stored_keys` 入参类型由 `Vec<BatchDeployEntry>` 改为 `Vec<BatchStoredDeployEntry>`（其内部本就只用 `key_id/key_name`，按 key_id 从安全存储取密钥）。
- 前端 `tauri.ts` 中 `deployTemplateBatchWithStoredKeys(entries: Array<{ keyId; keyName }>)` 已匹配，无需改。

## C. 部署执行加固（`src-tauri/src/lib.rs`）

### C1. 异步化
- 将 `validate_zeabur_token`、`deploy_template_with_api_key` 等 shell-out 命令改为 `async fn`，内部用 `tauri::async_runtime::spawn_blocking` 包裹阻塞的 `std::process::Command`，避免阻塞主线程。
- `invoke_handler` 注册不变（Tauri 支持 async command）。

### C2. token 经 env 传入，移出 argv
- 登录命令改为：`Command::new("npx").args(["zeabur@latest","auth","login"]).env("ZEABUR_TOKEN", api_key)`，移除 `--token <key>` 参数。
  - 若 zeabur CLI 不读 `ZEABUR_TOKEN`，回退方案：保留 `--token` 但通过 stdin 传入（`auth login --token-stdin` 若支持）。实现时以 `ZEABUR_TOKEN` 为首选，单测仅断言 token 不在 args。
- 部署命令 `template deploy -f <tmp>` 同样附带 `.env("ZEABUR_TOKEN", api_key)` 以复用会话。

## D. UI 补齐（`src/pages/*`, `src/App.tsx`）

| 位置 | 现状 | 动作 |
|---|---|---|
| `DeployPage.tsx:126` 复制 YAML | 无 onClick | 实现：`navigator.clipboard.writeText(generatedYaml)` + Toast |
| `DeployPage.tsx:127` 恢复上一草稿 | 无 onClick | 实现：取 `records` 中最近 `id` 以 `draft_` 开头者 → `loadRecord`；无则 `disabled` |
| `SettingsPage.tsx:201` 删除项目 | 无 onClick | 实现：`Modal.confirm` → `resetConfig()` + 新增 store action `clearRecords()` |
| `SettingsPage.tsx:89` projectId | render 内 `Math.random()` | 改为 `useMemo(() => 'prj_'+rand, [])` 单次生成（或存入 store） |
| `App.tsx:79-80` Help/Bell | 无 onClick | `disabled`（装饰） |
| `App.tsx:84-87` Profile/Billing/Logout | 无 onClick | `disabled`（业务未实现，范围外） |

新增 store action：`clearRecords: () => set({ records: [] })`（`deploymentStore.ts`）。

## E. 测试（PBT，新增最小测试设施）
- 选型：**Vitest + fast-check**（dev deps）。`vite.config.ts` 加 `test` 配置（或新增 `vitest.config.ts`）。
- 纯函数可测：`deepMergeConfig`（P1/P2）、`parseGitHubRepository`（已存在 `utils/github.ts`，round-trip）、`generateZeaburYaml`（`utils/template.ts`）。
- Rust 侧 token-not-in-argv（P5）：用 `#[cfg(test)]` 单测构造 args 向量断言不含 token。

## 风险与缓解
- HashRouter 改变 URL 形态（带 `#`）——桌面应用无影响。
- 一次性清理会丢失现有用户草稿/历史——已用户确认接受。
- `ZEABUR_TOKEN` 是否被 CLI 识别需实现期验证，已给回退方案。
- 新增测试设施增加依赖体积——仅 devDependencies。
