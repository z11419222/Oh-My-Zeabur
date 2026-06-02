# Proposal: 修复黑屏崩溃与补齐未实现功能

> 阶段：spec-research 产物（约束集合 + 可验证判据）。本文件不含实现，仅约束后续 `/ccg:spec-plan`。

## 背景 / Why

桌面应用（Tauri + React19 + TS + Semi UI，包名 `mirrorzeabur`）当前“部分按钮点击后进入黑屏、许多功能未完整实现、基本无法使用”。
经全量精读（前端 18 文件 + `src-tauri/src/lib.rs` 桥接层），问题可归为三类：

1. **结构性崩溃（黑屏根因）** —— 缺少 ErrorBoundary + zustand persist 无版本迁移，导致渲染期抛错卸载整棵 React 树。
2. **Rust⇄TS invoke 契约不一致** —— 多个命令的入参字段缺失，导致序列化失败、功能静默失效。
3. **未接线的占位 UI** —— 多个按钮无 onClick 或只弹 Toast，表现为“功能没实现”。

## 黑屏根因（主假设，高置信）

- `main.tsx` / `App.tsx` 全局**没有任何 ErrorBoundary**。React 19 中路由组件渲染抛错会卸载整树；dark 主题下空白即“黑屏”。
- `deploymentStore` 的 `persist` **没有 `version` / `migrate`**（`deploymentStore.ts:238-247`），且 `partialize` 持久化了完整嵌套的 `currentConfig` 到 `localStorage`。zustand 默认浅合并会用**旧 schema 的整个 `currentConfig` 覆盖默认值**。
- 当历史持久化数据缺失后来新增的嵌套字段时，页面直接访问会抛 `TypeError`：
  - `DeployPage.tsx:113` → `currentConfig.cluster.nodeType`
  - `TemplatePage.tsx:62` → `currentConfig.repository.owner`
  - `SettingsPage.tsx:187` → `currentConfig.repository.*`
- 因数据在 `localStorage`，**刷新后依旧黑屏** → 与“基本无法使用”完全吻合；“有些按钮黑屏”= 跳转到读取缺失字段的页面才崩。
- 待运行期验证：清空 `localStorage` 后应恢复，可确证此根因。

## What Changes（方向，非实现）

### A. 结构性健壮性（最高优先 / Critical）
- 引入全局 + 路由级 **ErrorBoundary**，提供可恢复的 fallback UI，杜绝整树卸载。
- 为 `deploymentStore.persist` 增加 `version` 与 `migrate`（或 `merge` 深合并 + 字段兜底），确保任何历史/缺字段数据都能安全回填默认值。
- 评估将 `BrowserRouter`（`main.tsx:10`）改为 **HashRouter / memory router**，以兼容 Tauri 桌面运行时（刷新、深链不破）。

### B. Rust⇄TS 契约对齐（High）
- `BatchDeployEntry.api_key` 为必填（`lib.rs:42-48`），但 `deployTemplateBatchWithStoredKeys` 只传 `{keyId,keyName}`（`tauri.ts:77-79`）→ 批量（存储密钥）部署**必然失败**。需对齐字段。
- `ZeaburKeyInfoDto.has_secret` 为必填（`lib.rs:50-61`），但保存路径 `addZeaburKey`/`saveZeaburKeysToDisk` 未带 `hasSecret`（`deploymentStore.ts:101-127`，`tauri.ts:81-83`）→ `save_zeabur_keys_to_disk` 反序列化失败 → **密钥列表无法落盘，重启即丢**。需用 `Option`/`#[serde(default)]` 或前端补字段。

### C. 补齐 / 收敛未实现 UI（Medium）
逐个明确：实现真实行为，或显式 disabled/移除（消灭静默 no-op）：
- `App.tsx:79-80` Help / Bell 按钮无 onClick。
- `App.tsx:84-87` 下拉 Profile / Billing / Logout 无 onClick。
- `DeployPage.tsx:126` 复制 YAML、`:127` 恢复上一草稿 无 onClick。
- `SettingsPage.tsx:97` 保存仅 Toast（region Select 未写回 store）；`:201` 删除项目无 onClick；`:89` projectId 在渲染中用 `Math.random()`（每次渲染抖动）。

### D. 部署执行健壮性（Medium / 含安全）
- `lib.rs:118/184/214` 在主线程同步 `npx zeabur@latest`，阻塞 UI 且强依赖 Node/npx 与网络。
- API Key 以 `--token <key>` CLI 明文参数传入（进程列表可见），属 verify-security 关注项。

## Impact

- **受影响代码**：`src/main.tsx`、`src/App.tsx`、`src/store/deploymentStore.ts`、`src/pages/*`、`src/components/DeployModal/index.tsx`、`src/lib/tauri.ts`、`src-tauri/src/lib.rs`、`src/types/deployment.ts`。
- **迁移风险**：persist schema 变更需处理现有用户 `localStorage`（迁移或一次性清理）。
- **外部依赖**：部署/校验依赖本机 `npx zeabur` CLI 与网络。

## 可验证成功判据 / Success Criteria

1. 在“干净”与“残缺 localStorage”两种初始状态下，依次点击 Deploy/History/Template/Settings 及各页内按钮，**页面均正常渲染、控制台无未捕获错误**。
2. 任一路由渲染抛错时显示 **fallback UI（ErrorBoundary）而非黑屏**，应用仍可导航。
3. 新增 Zeabur 密钥后**重启应用仍在**（落盘成功、列表恢复）。
4. 批量（存储密钥）部署返回**逐密钥结果，无 serde/契约错误**。
5. 所有可见按钮**要么有真实行为，要么显式禁用/移除**（无静默 no-op）。
6. 应用使用**与 Tauri 兼容的路由**（任意路由刷新仍可用）。

## 待用户确认（spec-plan 阶段决策点）

- 路由：保留 `BrowserRouter` 还是改 `HashRouter`/memory？
- persist 兼容：版本迁移 vs 一次性清理旧数据？
- 占位功能（Profile/Billing/Logout/删除项目/恢复草稿）：本轮实现 还是 先禁用占位？
- 部署执行：是否本轮改为异步线程 + 隐藏密钥传参？
