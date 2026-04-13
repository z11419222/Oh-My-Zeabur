# MirrorZeabur 技术架构设计

## 1. 项目目标

MirrorZeabur 的目标不是“编辑一个 YAML 文件”，而是把 **Zeabur 部署流程产品化**：

1. 用户通过 GUI 输入部署配置
2. 系统自动解析 GitHub 仓库信息并获取 repo ID
3. 系统生成符合 Zeabur schema 的模板 YAML
4. 系统调用 Zeabur CLI 完成认证、部署、模板发布与更新
5. 系统保存部署记录，支持后续集群扩容

---

## 2. 设计原则

### 2.1 模板只是中间产物
模板 YAML 是部署执行的输入之一，不是系统的唯一真相。

真正的核心对象应该是：

```text
DeploymentConfig
```

GUI 操作应先形成标准化 `DeploymentConfig`，再由渲染层生成 `zeabur.yaml`。

### 2.2 部署必须是有状态工作流
MirrorZeabur 不应只做“填表 + 调命令”，而是要有清晰的执行阶段：

1. 输入
2. 校验
3. 渲染
4. 预览
5. 认证
6. 执行
7. 记录

### 2.3 从第一版开始支持扩容语义
由于参考项目 `new-api` 存在明确的主从节点逻辑：

- `NODE_TYPE=master`
- `NODE_TYPE=slave`

以及共享：

- `SESSION_SECRET`
- `CRYPTO_SECRET`
- `SQL_DSN`
- `REDIS_CONN_STRING`

所以 MirrorZeabur 必须在模型层就显式支持：

- `single`
- `cluster-master`
- `cluster-slave`

而不是后期再硬加。

---

## 3. 总体架构

```text
┌───────────────────────────────────────┐
│               GUI Layer               │
│  仓库输入 / 模式选择 / 参数表单 / 预览 │
└───────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│         Application Service Layer     │
│  配置编排 / 校验 / 状态机 / 日志聚合    │
└───────────────────────────────────────┘
        │                 │             │
        ▼                 ▼             ▼
┌───────────────┐ ┌────────────────┐ ┌────────────────┐
│ Repo Resolver │ │ Template Engine│ │ Deploy Executor│
│ GitHub repoID │ │ 渲染 zeabur.yaml│ │ CLI / API 执行 │
└───────────────┘ └────────────────┘ └────────────────┘
        │                                  │
        ▼                                  ▼
┌────────────────┐                 ┌────────────────────┐
│ Secret Manager │                 │ Deployment Store   │
│ 密钥生成/保存   │                 │ 部署记录 / 模板快照 │
└────────────────┘                 └────────────────────┘
```

---

## 4. 核心模块划分

## 4.1 GUI Layer

负责：

- 仓库地址输入
- 分支输入
- repo ID 自动回填展示
- 部署模式选择
- 数据库 / Redis 模式选择
- Secret 输入与生成
- 最终模板预览
- 执行状态展示

建议页面结构：

1. **项目来源页**
   - GitHub 仓库 URL / owner/repo / branch
2. **部署模式页**
   - single / cluster-master / cluster-slave
3. **服务配置页**
   - 内置 PostgreSQL / 外部 PostgreSQL
   - 内置 Redis / 外部 Redis
4. **安全配置页**
   - `SESSION_SECRET`
   - `CRYPTO_SECRET`
5. **高级参数页**
   - `TZ`
   - `ERROR_LOG_ENABLED`
   - `BATCH_UPDATE_ENABLED`
   - `BATCH_UPDATE_INTERVAL`
   - `SYNC_FREQUENCY`
   - `LOG_SQL_DSN`
   - `FRONTEND_BASE_URL`
6. **模板预览页**
7. **部署执行页**

---

## 4.2 DeploymentConfig（领域模型）

MirrorZeabur 的核心数据模型应统一为：

```ts
type DeployMode = 'single' | 'cluster-master' | 'cluster-slave'

interface RepositoryConfig {
  repoUrl: string
  owner: string
  repo: string
  repoId: number
  branch: string
}

interface ServiceModeConfig {
  useInternalPostgres: boolean
  useInternalRedis: boolean
  externalSqlDsn?: string
  externalRedisConnString?: string
}

interface ClusterConfig {
  nodeType: 'master' | 'slave'
  syncFrequency: number
  batchUpdateEnabled: boolean
  batchUpdateInterval: number
}

interface SecretConfig {
  sessionSecret: string
  cryptoSecret: string
}

interface RuntimeConfig {
  tz: string
  errorLogEnabled: boolean
  frontendBaseUrl?: string
  logSqlDsn?: string
}

interface DeploymentConfig {
  projectName: string
  deployMode: DeployMode
  repository: RepositoryConfig
  services: ServiceModeConfig
  cluster: ClusterConfig
  secrets: SecretConfig
  runtime: RuntimeConfig
}
```

### 设计原因

这样做能把：

- GUI
- 模板渲染
- CLI 执行
- 部署记录

统一到同一份配置对象上，避免多套状态源。

---

## 4.3 Repo Resolver

负责：

- 解析 GitHub URL
- 提取 `owner/repo`
- 调 GitHub API 获取数字 repo ID
- 校验 branch / repo 可访问性

### 关键点

Zeabur 模板 `source: GITHUB` 使用的是 **数字 repo ID**，而不是单纯仓库名。

因此 Repo Resolver 不是可选项，而是必需项。

---

## 4.4 Template Engine

负责：

- 将 `DeploymentConfig` 渲染成 `zeabur.yaml`
- 根据部署模式切换模板结构
- 本地做 schema 校验

### 输出策略

不建议拼字符串，而建议：

1. 先生成中间对象结构
2. 再序列化为 YAML

这样更容易做：

- 模板 diff
- 预览
- schema 校验
- 未来多模板支持

### 模式差异

#### single / cluster-master
- app
- postgres
- redis

#### cluster-slave
- 仅 app
- 不再创建 postgres / redis
- `NODE_TYPE=slave`

---

## 4.5 Secret Manager

负责：

- 自动生成强随机密钥
- 校验密钥长度与格式
- 本地安全保存
- 后续 slave 扩容时自动复用

### 至少管理这些 secrets

- `SESSION_SECRET`
- `CRYPTO_SECRET`
- PostgreSQL password

### 保存策略建议

优先使用：

- 系统 Keychain / Credential Manager

而不是纯明文配置文件。

如果第一版不做系统密钥库，也至少要：

- 支持“仅保存指纹 + 手动重新输入”
- 或“本地加密保存”

---

## 4.6 Deploy Executor

负责：

- 检查 Node.js / `npx` / Zeabur CLI
- 执行 Zeabur 登录
- 执行模板 deploy / create / update
- 收集 stdout / stderr / exit code

### 为什么要独立成模块

Zeabur CLI 当前适合作为第一版执行器，但以后可能切换到 Public API / GraphQL。

因此建议抽象接口：

```ts
interface DeploymentExecutor {
  login(input: AuthInput): Promise<void>
  deployTemplate(filePath: string, context: DeployContext): Promise<DeployResult>
  createTemplate(filePath: string): Promise<CreateTemplateResult>
  updateTemplate(code: string, filePath: string): Promise<void>
}
```

第一版实现：

- `ZeaburCliExecutor`

未来可以增加：

- `ZeaburGraphqlExecutor`

---

## 4.7 Deployment Store

负责保存：

- 部署配置快照
- 生成过的模板 YAML
- 模板 code
- 部署日志摘要
- 主节点共享服务信息

### 为什么重要

这个项目不只是“一次部署”，还会涉及：

- 再部署
- 更新模板
- 增加 slave 节点
- 查历史配置

所以必须有“部署档案”概念。

### 建议记录字段

- projectName
- repoUrl
- repoId
- branch
- deployMode
- useInternalPostgres
- useInternalRedis
- sqlDsnSource
- redisSource
- sessionSecretFingerprint
- cryptoSecretFingerprint
- templateCode
- lastTemplateYamlPath
- lastDeployTime
- lastDeployStatus

---

## 5. 关键工作流设计

## 5.1 首次单节点 / 主节点部署

```text
输入仓库 → 获取 repo ID → 选择部署模式 → 填 secrets / 参数
→ 渲染 zeabur.yaml → schema 校验 → Zeabur 登录 → template deploy
→ 保存部署记录
```

## 5.2 后续扩容 slave 节点

```text
选择已有部署记录 → 复用共享 DSN / Redis / secrets
→ 设置 NODE_TYPE=slave → 渲染 slave 模板
→ deploy → 保存新的节点记录
```

## 5.3 发布模板

```text
生成 zeabur.yaml → template create → 保存 template code
```

## 5.4 更新模板

```text
选择已有 template code → 重新渲染模板 → template update
```

---

## 6. 为什么要支持“共享第一次部署出来的 PostgreSQL / Redis”

基于 `new-api` 代码与当前模板分析，下面这条设计成立：

### 第一次部署
- `New API`（master）
- `PostgreSQL`
- `Redis`

### 后续部署
- 新增 `New API`（slave）
- 共享第一次部署出来的 PostgreSQL / Redis

### 架构依据

- 应用通过 `SQL_DSN` 连接数据库
- 只有 `master` 节点会执行 migration
- 应用通过 `REDIS_CONN_STRING` 使用共享 Redis
- 多节点必须共享 `SESSION_SECRET` / `CRYPTO_SECRET`

所以 MirrorZeabur 的设计必须支持：

- 首次部署时创建共享服务
- 后续扩容时复用共享服务

---

## 7. MVP 范围建议

第一版只做下面这些：

1. GitHub 仓库输入 + repo ID 自动获取
2. 部署模式：single / cluster-master / cluster-slave
3. Secrets 自动生成
4. 模板渲染与预览
5. Zeabur CLI 登录 / deploy / create / update
6. 部署记录存档

### 第一版先不做

- 完整 Zeabur API 代替 CLI
- 全 provider 密钥托管
- 复杂监控系统
- 多模板市场管理后台

---

## 8. 参考路径

### 本地参考项目

- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\zeabur.yaml`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\docker-compose.yml`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\.env.example`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\init.go`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\redis.go`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\model\main.go`
- `G:\Users\Administrator\Documents\AI\antigravity\jiuzhou\jiuzhou\template.yaml`

### Zeabur 参考资料

- `https://zeabur.com/docs/en-US/template/template-format`
- `https://schema.zeabur.app/template.json`
- `https://github.com/zeabur/zeabur-template-doc`
- `https://zeabur.com/docs/en-US/developer/public-api`
