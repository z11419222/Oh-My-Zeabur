# MirrorZeabur 参考资料整理

本文档用于记录 MirrorZeabur 在设计阶段所参考的本地项目、模板文件与 Zeabur 官方资料。

---

## 1. 本地参考项目（必须引用路径）

## 1.1 New API 项目（当前主要参考项目）

根路径：

`G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api`

### 重点参考文件

#### Zeabur 模板
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\zeabur.yaml`
  - 当前 New API 的 Zeabur 模板实现
  - 参考点：
    - `PREBUILT` + `GIT` 混合服务定义
    - PostgreSQL / Redis instructions
    - repo ID 占位提示

#### Compose 参考
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\docker-compose.yml`
  - 参考点：
    - 默认部署栈：app + postgres + redis
    - `--log-dir /app/logs`
    - `/data` 与 `/app/logs` volume 约定
    - 3000 端口约定

#### 环境变量总表
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\.env.example`
  - 参考点：
    - `SQL_DSN`
    - `LOG_SQL_DSN`
    - `REDIS_CONN_STRING`
    - `SESSION_SECRET`
    - `FRONTEND_BASE_URL`
    - `NODE_TYPE`
    - `SYNC_FREQUENCY`
    - `BATCH_UPDATE_ENABLED`
    - `BATCH_UPDATE_INTERVAL`

#### 节点角色与 secrets
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\init.go`
  - 参考点：
    - `NODE_TYPE`
    - `SESSION_SECRET`
    - `CRYPTO_SECRET`
    - `SYNC_FREQUENCY`
    - `BATCH_UPDATE_INTERVAL`

#### Redis 共享逻辑
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\redis.go`
  - 参考点：
    - `REDIS_CONN_STRING`
    - Redis 连接启用条件
    - 同步频率语义

#### 主从迁移控制
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\model\main.go`
  - 参考点：
    - `SQL_DSN`
    - `LOG_SQL_DSN`
    - 只有 master 执行 migration

#### 文档侧多机说明
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\README.md`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\README.zh_CN.md`
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\docs\installation\BT.md`
  - 参考点：
    - 多机部署必须共享 `SESSION_SECRET`
    - 公用 Redis 必须设置 `CRYPTO_SECRET`

---

## 1.2 其他模板参考

### 九州修仙录模板
- `G:\Users\Administrator\Documents\AI\antigravity\jiuzhou\jiuzhou\template.yaml`

参考价值：

- 更完整的 Zeabur 模板元数据写法
- 顶部说明注释
- `description` / `icon` / `tags` / `readme`
- `instructions`
- `expose: true`
- `dependencies`
- GitHub repo ID 写法

---

## 2. Zeabur 官方资料（检索与总结）

以下是设计 MirrorZeabur 时应引用的官方资料：

### 2.1 模板格式
- `https://zeabur.com/docs/en-US/template/template-format`
  - 内容：模板 YAML 的整体结构、变量、服务、端口、卷、instructions 等

### 2.2 JSON Schema
- `https://schema.zeabur.app/template.json`
  - 内容：Zeabur 模板 schema
  - 用途：本地 YAML 校验、IDE 补全、GUI 生成结果校验

### 2.3 预构建服务 Schema
- `https://schema.zeabur.app/prebuilt.json`
  - 内容：服务级 schema，例如 image、command、args、ports、volumes、env、configs、healthCheck、instructions
  - 用途：构建更强的模板渲染与本地校验能力

### 2.4 模板参考仓库
- `https://github.com/zeabur/zeabur-template-doc`
  - 内容：Zeabur 模板文档仓库、参考模板写法

### 2.5 CLI 文档
- `https://zeabur.com/docs/en-US/developer/cli`
  - 内容：CLI 登录、context、deploy、template update 等操作说明

### 2.6 Public API / GraphQL
- `https://zeabur.com/docs/en-US/developer/public-api`
  - 内容：Zeabur 公共 API 入口说明
  - 用途：后续如果 CLI 交互能力不足，可研究用 API 替代部分流程

### 2.7 API Keys
- `https://zeabur.com/docs/en-US/developer/api-keys`
  - 内容：API Key 生成方式
  - 用途：token 登录 / API 执行

### 2.8 模板维护
- `https://zeabur.com/docs/en-US/template/maintain-template`
  - 内容：模板 create / update / delete 生命周期说明

### 2.9 Deploy Button
- `https://zeabur.com/docs/en-US/deploy/methods/deploy-button`
  - 内容：模板按钮 URL / 模板 code 的使用方式

### 2.10 GraphQL Explorer
- `https://studio.apollographql.com/public/zeabur/variant/main/explorer`
  - 内容：Zeabur GraphQL Explorer

### 2.11 CLI 仓库
- `https://github.com/zeabur/cli`
  - 内容：CLI 源码实现参考

---

## 3. 已总结出的 Zeabur CLI 工作流

基于资料检索，MirrorZeabur 当前应考虑的 CLI 流程包括：

### 登录
```bash
npx zeabur@latest auth login
```

### Token 登录
```bash
npx zeabur@latest auth login --token <token>
```

### 测试 / 部署模板
```bash
npx zeabur@latest template deploy -f template.yaml
```

### 发布模板
```bash
npx zeabur@latest template create -f template.yaml
```

### 更新模板
```bash
npx zeabur@latest template update -c <code> -f template.yaml
```

### 删除模板
```bash
npx zeabur@latest template delete -c <code>
```

---

## 4. 对 MirrorZeabur 有直接影响的结论

### 4.1 模板输入的真实核心不是 YAML，而是 DeploymentConfig
GUI 不应直接面向 YAML 字段编辑，而应先形成统一部署配置对象，再渲染 YAML。

### 4.2 repo ID 需要自动获取
Zeabur `source: GITHUB` 使用数字 repo ID，因此 MirrorZeabur 必须内置 GitHub Repo Resolver。

### 4.3 CLI 自动化有边界
Zeabur CLI 可以完成 deploy/create/update，但在完全非交互化方面存在限制。

因此 MirrorZeabur 第一版可以先用 CLI，后续预留切换到 Public API / GraphQL 的能力。

### 4.4 集群扩容模式必须内建
参考 New API 的代码和文档：

- `NODE_TYPE=master`
- `NODE_TYPE=slave`
- 所有节点共享：
  - `SQL_DSN`
  - `REDIS_CONN_STRING`
  - `SESSION_SECRET`
  - `CRYPTO_SECRET`

所以 MirrorZeabur 必须支持：

- single
- cluster-master
- cluster-slave

### 4.5 首次部署出来的 PostgreSQL / Redis 可以作为共享基础设施
基于 `new-api` 的代码与部署模式，可以采用：

- 第一次部署：`New API(master) + PostgreSQL + Redis`
- 后续扩容：新增 `New API(slave)`，复用第一次部署出来的 PostgreSQL / Redis

这对 MirrorZeabur 的产品设计有直接影响，因此必须内建“扩容节点”工作流。

---

## 5. 结论

MirrorZeabur 的设计应建立在三类参考之上：

1. **本地参考项目**：New API
2. **本地完整模板参考**：Jiuzhou
3. **Zeabur 官方资料**：模板 schema + CLI / API 工作流

这三类资料共同决定了 MirrorZeabur 的合理边界：

- 它不只是 YAML 生成器
- 它应该是 Zeabur 部署工作流编排器
- 它需要支持后续扩容和模板生命周期管理
