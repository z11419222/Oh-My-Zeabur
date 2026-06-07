# Specs: 修复黑屏崩溃与补齐未实现功能

> spec-plan 产物。零决策、可机械执行。所有需求附可验证场景 + PBT 不变量。

## R1 — 渲染抛错绝不黑屏（Critical）

应用必须在任意路由组件渲染抛错时，显示可恢复的 fallback UI，而非卸载整树变黑屏。

- **场景 1.1**：WHEN 任一页面组件在渲染期抛出异常，THEN 显示 ErrorBoundary fallback（含错误摘要 + "返回首页/重试"按钮），侧边导航与顶栏仍可用。
- **场景 1.2**：WHEN 在 fallback 上点击"返回首页"，THEN 重置错误边界并导航到 `/deploy`，页面正常渲染。
- **PBT P1（不变量保持）**：对任意 `currentConfig`（含字段缺失/类型异常的构造值），渲染任一页面都不得使整个 `#root` 变空。证伪策略：用 fast-check 生成残缺/异常 config 注入 store，断言 ErrorBoundary fallback 出现且 `#root` 非空。

## R2 — 持久化数据永远安全（Critical）

`deploymentStore` 的 persist 必须保证：任何历史/损坏的 localStorage 数据都不能让页面读到 `undefined` 的嵌套字段。采用**一次性清理**策略。

- **场景 2.1**：WHEN 启动时检测到 persist 数据版本 < 当前版本（或无版本），THEN 丢弃旧数据，状态回退到 `DEFAULT_DEPLOYMENT_CONFIG`（records 一并清空），不抛错。
- **场景 2.2**：WHEN persist 数据版本 == 当前版本，THEN 正常恢复用户数据。
- **场景 2.3**：WHEN localStorage 中 JSON 损坏无法解析，THEN 回退默认而非崩溃。
- **PBT P2（幂等 + 兜底）**：`migrate(anyOldState, anyVersion)` 的输出必须始终是一个结构完整的 `DeploymentConfig`（所有嵌套对象存在）。证伪：fast-check 生成任意 old state，断言 migrate 结果对 `cluster/services/repository/secrets/runtime` 五个嵌套键 deep-defined。

## R3 — Tauri 兼容路由（High）

- **场景 3.1**：WHEN 在任意路由（/deploy、/history、/template、/settings）按 F5/重载，THEN 应用仍正确渲染该路由，不出现空白或 404。
- **决策**：使用 `HashRouter`。
- **PBT P3（往返）**：对四个路由路径集合，导航→读取 `location.pathname` 应等于目标路径（hash 模式下规范化后相等）。

## R4 — Rust⇄TS invoke 契约一致（High）

所有 invoke 命令的入参在前后端字段必须可成功序列化/反序列化。

- **场景 4.1**：WHEN 新增一个 Zeabur 密钥并触发 `save_zeabur_keys_to_disk`，THEN 落盘成功（无 serde 错误），重启应用后该密钥仍在列表中。
- **场景 4.2**：WHEN 以"批量 + 存储密钥"方式部署，THEN `deploy_template_batch_with_stored_keys` 成功反序列化入参并返回逐密钥结果数组，无字段缺失错误。
- **PBT P4（往返）**：前端构造的 `ZeaburPersistedState` 经 `save→load` 后，`keys[].id/name` 集合不变（round-trip 保持）。证伪：fast-check 生成 keys 列表往返比对。

## R5 — 部署执行加固（High）

- **场景 5.1**：WHEN 触发部署/校验，THEN UI 主线程不被阻塞（命令以异步方式执行，按钮 loading 态可见，界面可交互）。
- **场景 5.2**：API Key 不得作为命令行参数出现在 argv 中；通过环境变量 `ZEABUR_TOKEN` 传入子进程。
- **PBT P5（不变量）**：任意 token 字符串都不出现在最终 `Command` 的 args 向量里。证伪：单测断言构造的 args 不含 token 子串。

## R6 — 无静默 no-op 按钮（Medium）

每个可见按钮要么执行真实动作，要么显式 `disabled`。

- **场景 6.1（复制 YAML）**：WHEN 在 DeployPage 点击"复制 YAML"，THEN 将 `generatedYaml` 写入剪贴板并 Toast 成功。
- **场景 6.2（恢复上一草稿）**：WHEN 存在 draft 记录且点击"恢复上一草稿"，THEN 载入最近的 draft 配置；无 draft 时按钮 `disabled`。
- **场景 6.3（删除项目）**：WHEN 点击"删除项目"，THEN 弹确认框；确认后 `resetConfig()` 并清空 records，Toast 成功。
- **场景 6.4（projectId 稳定）**：WHEN SettingsPage 多次重渲染，THEN 显示的 `projectId` 不变（不得每次 render 用 `Math.random()` 重算）。
- **场景 6.5（装饰按钮）**：Help / Bell / Profile / Billing 在未实现前一律 `disabled`；Logout 若无会话语义则同样 `disabled`。
- **PBT P6（确定性/幂等）**：给定同一组件 props/state，`projectId` 在 N 次渲染中恒定。证伪：渲染两次比对文本。

## 范围外（Out of Scope，记录但本轮不做）
- 账户/计费/登出的真实业务实现（Profile/Billing/Logout）。
- region Select 接入 YAML 生成（schema 暂无 region 字段）。
