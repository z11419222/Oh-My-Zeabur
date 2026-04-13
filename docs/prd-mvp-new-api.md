# MirrorZeabur PRD（MVP 阶段）

## 1. 文档目的

本文档用于定义 MirrorZeabur 在 **MVP 阶段** 的产品范围、目标用户、核心能力与非目标边界。

当前阶段必须明确：

> **MirrorZeabur 的第一版，不做“通用全项目模板平台”，而是先围绕 `new-api` 项目的 Zeabur 模板部署场景落地。**

在 MVP 验证成功后，再逐步扩展到其他项目。

---

## 2. 产品背景

当前 `new-api` 项目已经具备：

- Zeabur 模板文件
- Docker Compose 部署模式
- 多节点 / 主从部署语义
- 共享 PostgreSQL / Redis / Secret 的集群要求

但实际使用中仍存在几个问题：

1. Zeabur 模板需要人工修改与理解
2. GitHub 数字 repo ID 获取不友好
3. 环境变量较多，容易配置错误
4. 初次部署与后续扩容缺乏统一操作入口
5. Zeabur CLI 虽然可用，但对普通用户不够友好

MirrorZeabur 的 MVP 就是为了解决这些问题。

---

## 3. MVP 产品定位

MirrorZeabur MVP 是一个：

> **专门面向 `new-api` 项目的 Zeabur 部署助手**

它的目标不是先做成“支持任意仓库的一般化 GUI”，而是先在 `new-api` 这个具体项目场景里，把：

- 参数收集
- 模板生成
- CLI 部署
- 集群扩容

这条链路打通并产品化。

---

## 4. 当前 MVP 聚焦范围

## 4.1 只服务 `new-api`

MVP 阶段默认支持的目标项目：

- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api`

它对应的仓库模式、环境变量、部署拓扑、集群语义都已经明确，可作为 MirrorZeabur 第一阶段的稳定样板。

### 这意味着 MVP 的模板与逻辑默认基于：

- `new-api` 的服务拓扑
- `new-api` 的环境变量模型
- `new-api` 的 cluster 语义
- `new-api` 的 Zeabur 模板结构

而不是先抽象成“适配所有项目”的高度通用系统。

---

## 4.2 MVP 支持的部署模式

围绕 `new-api`，MVP 至少支持三种模式：

### 模式 1：single
- 单节点快速部署
- 部署：
  - `New API`
  - `PostgreSQL`
  - `Redis`

### 模式 2：cluster-master
- 首次集群主节点部署
- 部署：
  - `New API`（master）
  - `PostgreSQL`
  - `Redis`
- PostgreSQL / Redis 作为后续 slave 节点共享基础设施

### 模式 3：cluster-slave
- 基于已有主节点扩容
- 仅部署新的 `New API` 节点
- 新节点设置：
  - `NODE_TYPE=slave`
- 复用已有：
  - `SQL_DSN`
  - `REDIS_CONN_STRING`
  - `SESSION_SECRET`
  - `CRYPTO_SECRET`

---

## 5. 目标用户

MVP 阶段目标用户不是所有 Zeabur 用户，而是更聚焦的一类人：

### 主要用户
1. 部署 `new-api` 的个人开发者
2. 维护 `new-api` 的部署人员
3. 需要在 Zeabur 上快速部署 `new-api` 的运维 / 站长

### 次要用户
1. 需要做多节点扩容的 `new-api` 使用者
2. 需要发布 `new-api` 派生模板的人

---

## 6. MVP 核心能力

## 6.1 仓库信息输入与 repo ID 自动获取

用户输入：

- GitHub 仓库 URL
或
- `owner/repo`

系统自动：

- 获取 GitHub 数字 repo ID
- 回填给模板渲染层

### 为什么这是 MVP 必需能力

因为 `new-api` 当前 Zeabur 模板依赖 GitHub 数字 repo ID，手工获取门槛过高。

---

## 6.2 `new-api` 参数表单化

MVP 阶段，参数表单围绕 `new-api` 已知变量设计，至少包括：

- `SESSION_SECRET`
- `CRYPTO_SECRET`
- `SQL_DSN`（或是否使用内置 PostgreSQL）
- `REDIS_CONN_STRING`（或是否使用内置 Redis）
- `TZ`
- `ERROR_LOG_ENABLED`
- `BATCH_UPDATE_ENABLED`
- `BATCH_UPDATE_INTERVAL`
- `SYNC_FREQUENCY`
- `NODE_TYPE`
- `FRONTEND_BASE_URL`
- `LOG_SQL_DSN`

---

## 6.3 Zeabur 模板生成

基于 `new-api` 的结构，自动生成对应 `zeabur.yaml`。

### 模板生成要求
- 符合 Zeabur schema
- 服务拓扑与 `new-api` 一致
- 可区分 single / master / slave 模式
- 支持模板预览

---

## 6.4 Zeabur CLI 登录与部署

MVP 阶段应支持：

- CLI 登录
- token 登录
- `template deploy`
- `template create`
- `template update`

并展示：

- 当前步骤
- stdout / stderr
- 最终结果

---

## 6.5 部署记录与后续扩容复用

MVP 阶段必须支持保存部署记录，至少包括：

- 仓库信息
- repo ID
- 部署模式
- 模板快照
- 是否使用内置 PostgreSQL / Redis
- 主节点共享 PostgreSQL / Redis 信息
- `SESSION_SECRET` / `CRYPTO_SECRET` 的指纹或安全引用

### 目的
为后续 `cluster-slave` 扩容复用已有部署配置。

---

## 7. 非目标（MVP 不做什么）

为了避免第一版失控，以下内容不纳入 MVP：

1. 不先支持“任意项目模板平台”
2. 不做完全通用的模板 DSL 设计器
3. 不做所有 Zeabur 功能的完整控制台替代
4. 不做 provider API key 的统一托管平台
5. 不做完整 GraphQL API 替代 CLI 的执行器
6. 不做模板市场级多模板管理后台

---

## 8. 为什么 MVP 要先聚焦 `new-api`

## 8.1 参考目标明确
`new-api` 当前已经具备：

- 现成 Zeabur 模板
- 现成 Docker Compose
- 清晰的 env 模型
- 明确的 cluster-master / cluster-slave 语义

所以它非常适合作为 MirrorZeabur 的第一批验证场景。

## 8.2 约束稳定
如果第一版一上来就做通用模板平台，会同时面对：

- 各项目服务结构差异
- Dockerfile 差异
- env 差异
- cluster 模式差异
- 构建入口差异

这会让系统过早抽象，导致复杂度失控。

## 8.3 先验证“链路跑通”更重要
MVP 更重要的是验证：

- GUI → Config → Template → CLI → Deploy → Record

这条链是否成立。

`new-api` 恰好是最适合的首个落地样板。

---

## 9. MVP 成功标准

MVP 阶段可以视为成功，当以下条件成立：

1. 用户无需手工编辑 `zeabur.yaml`
2. 用户无需自己查 GitHub repo ID
3. 用户可在 GUI 中完成 `new-api` 首次部署
4. 用户可在 GUI 中基于已有主节点新增 slave 节点
5. 生成的模板通过 Zeabur schema 校验
6. CLI 执行结果可视化，失败可定位
7. 部署配置可复用

---

## 10. 后续扩展方向（MVP 之后）

当 `new-api` 场景跑通后，再逐步扩展到其他项目。

## 10.1 第二阶段：支持更多固定项目模板

例如新增：

- 项目 A 模板
- 项目 B 模板
- 项目 C 模板

此时 MirrorZeabur 仍然是：

> 多项目模板助手

而不是完全自由模板平台。

## 10.2 第三阶段：抽象为项目适配器机制

等积累了足够多的项目后，再抽象：

- `ProjectAdapter`
- `EnvSchema`
- `ServiceTopology`
- `ClusterStrategy`

这样不同项目就能通过适配器接入。

## 10.3 第四阶段：更通用的平台能力

后续才考虑：

- GraphQL API 全自动部署
- 多模板版本管理
- 可视化模板设计器
- 更强的模板市场工作流

---

## 11. 参考路径（当前阶段）

### 当前主要参考项目
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api`

### 关键参考文件
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\zeabur.yaml`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\docker-compose.yml`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\.env.example`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\init.go`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\redis.go`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\model\main.go`
- `G:\Users\Administrator\Documents\AI\antigravity\jiuzhou\jiuzhou\template.yaml`

### 关键外部资料
- `https://zeabur.com/docs/en-US/template/template-format`
- `https://schema.zeabur.app/template.json`
- `https://schema.zeabur.app/prebuilt.json`
- `https://zeabur.com/docs/en-US/developer/cli`
- `https://zeabur.com/docs/en-US/developer/public-api`

---

## 12. 结论

MirrorZeabur 的 MVP 必须明确聚焦：

> **当前阶段仅针对 `new-api` 项目的 Zeabur 模板部署进行开发。**

其目标是优先验证产品链路与工程实现的正确性。等 `new-api` 场景稳定后，再扩展到其他项目。
