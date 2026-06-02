# Tasks: 修复黑屏崩溃与补齐未实现功能

> 所有任务为 checkbox 格式。按依赖顺序执行；每组完成后建议跑构建。

## 1. 结构性健壮性（黑屏根因 / Critical）
- [x] 1.1 新增 `src/components/ErrorBoundary/index.tsx`：class 组件实现 `getDerivedStateFromError` + `componentDidCatch`，提供 fallback UI（返回首页 / 重试）
- [x] 1.2 在 `src/App.tsx` 用 ErrorBoundary 包裹 `<Routes>`（路由级，注入 navigate 重置回调）
- [x] 1.3 在 `src/main.tsx` 顶层再包一层 ErrorBoundary（应用级兜底）
- [x] 1.4 `src/main.tsx`：将 `BrowserRouter` 替换为 `HashRouter`
- [x] 1.5 新增 `src/utils/configMerge.ts`：纯函数 `deepMergeConfig(defaults, partial)`，递归用默认值回填缺失嵌套键
- [x] 1.6 `src/store/deploymentStore.ts`：persist 增加 `version: 1` + `migrate`（version<1 返回 undefined 丢弃旧数据）+ `merge` 调用 `deepMergeConfig` 兜底

## 2. Rust⇄TS 契约对齐（High）
- [x] 2.1 `src-tauri/src/lib.rs`：`ZeaburKeyInfoDto.has_secret` 加 `#[serde(default)]`
- [x] 2.2 `src-tauri/src/lib.rs`：新增 `BatchStoredDeployEntry { key_id, key_name }`（camelCase, 无 api_key）
- [x] 2.3 `src-tauri/src/lib.rs`：`deploy_template_batch_with_stored_keys` 入参改为 `Vec<BatchStoredDeployEntry>`
- [x] 2.4 校验 `src/lib/tauri.ts` 中 `deployTemplateBatchWithStoredKeys` 签名与 2.3 一致（已匹配 `{ keyId, keyName }`）

## 3. 部署执行加固（High）
- [x] 3.1 `src-tauri/src/lib.rs`：shell-out 命令改 `async fn` + `tauri::async_runtime::spawn_blocking`（`run_zeabur_command` 助手）
- [x] 3.2 `src-tauri/src/lib.rs`：登录/部署命令移除 `--token <key>` argv，改用 `.env("ZEABUR_TOKEN", api_key)`
- [x] 3.3 `validate_stored_zeabur_key` / `deploy_template_with_stored_key` / 两个 batch 命令随之改 async 并 await

## 4. UI 补齐（无静默 no-op / Medium）
- [x] 4.1 `src/store/deploymentStore.ts`：新增 action `clearRecords: () => set({ records: [] })`
- [x] 4.2 `src/pages/DeployPage.tsx`：复制 YAML 按钮接 `navigator.clipboard.writeText(generatedYaml)` + Toast
- [x] 4.3 `src/pages/DeployPage.tsx`：恢复上一草稿按钮接最近 `draft_` 记录 → `loadRecord`；无 draft 时 `disabled`
- [x] 4.4 `src/pages/SettingsPage.tsx`：删除项目按钮接 `Modal.confirm` → `resetConfig()` + `clearRecords()` + Toast
- [x] 4.5 `src/pages/SettingsPage.tsx`：projectId 改为 `useMemo` 单次生成，消除 render 内 `Math.random()`
- [x] 4.6 `src/App.tsx`：Help/Bell/Profile/Billing/Logout 统一加 `disabled`（业务范围外）

## 5. 测试设施 + PBT（Property-Based Testing）
- [x] 5.1 添加 devDeps：`vitest`、`fast-check`、`jsdom`、`@testing-library/react`；新增 `vitest.config.ts`（jsdom）；package.json 加 `"test": "vitest run"`
- [x] 5.2 `src/utils/configMerge.test.ts`：P2 —— 任意 old state，五嵌套键 deep-defined（fast-check）
- [x] 5.3 `src/utils/github.test.ts`：parseGitHubRepository round-trip / 边界
- [x] 5.4 `src/utils/template.test.ts`：generateZeaburYaml 对默认 + 残缺 config 不抛错且合法 YAML
- [x] 5.5 `src-tauri/src/lib.rs`：`#[cfg(test)]` 断言 login/deploy args 不含 token 子串（P5）
- [x] 5.6 `src/components/ErrorBoundary/index.test.tsx`：注入抛错子组件，断言 fallback 出现（P1）

## 6. 验证关卡
- [x] 6.1 `bun run build`（`tsc -b && vite build`）通过，无类型错误（lottie-web 的 eval/chunk 警告为第三方既有，非本次代码）
- [ ] 6.2 `cargo build`（src-tauri）—— **被环境阻塞**：本机 bash 的 PATH 上 `C:\Program Files\Git\usr\bin\link.exe`（GNU coreutils link）遮蔽了 MSVC `link.exe`，且 `cl.exe`/vswhere 不可用；在依赖 build-script 链接阶段即失败，未触及 lib.rs。需在「x64 Native Tools 命令提示符」或 Windows CI 中编译。
- [x] 6.3 `bun run test` 全绿（15 用例，含 4 条 PBT）
- [ ] 6.4 手动冒烟：需运行桌面应用（`bun run tauri:dev`），当前环境无法启动 GUI；建议在本机 Native Tools 环境执行
- [ ] 6.5 运行 `/ccg:verify-security` 与 `/ccg:verify-quality`（成本考量，待用户确认后执行）
