# MirrorZeabur

MirrorZeabur 是一个面向 **Zeabur 模板部署** 的桌面 / GUI 工具项目，目标是让用户通过图形界面填写部署参数，自动生成 `zeabur.yaml`，并通过 **Zeabur CLI** 完成一键部署、模板发布与后续扩容。

## 项目定位

MirrorZeabur 不是单纯的模板编辑器，而是一个 **Zeabur 部署编排器**。

它要解决的问题包括：

1. 采集仓库与部署参数
2. 自动获取 GitHub 仓库数字 ID
3. 生成符合 Zeabur schema 的模板 YAML
4. 调用 Zeabur CLI 完成登录、部署、发布、更新
5. 保存部署记录，支持后续扩容为 slave 节点
6. 为集群模式复用共享 PostgreSQL / Redis / Secrets

---

## 核心目标

### 1. 面向首次部署
- 用户输入 GitHub 仓库地址 / owner/repo / branch
- GUI 自动获取 GitHub 数字仓库 ID
- 生成 `zeabur.yaml`
- 通过 Zeabur CLI 一键部署：
  - `New API`
  - `PostgreSQL`
  - `Redis`

### 2. 面向后续扩容
- 在已有部署基础上新增 `New API` 节点
- 新节点默认设置为 `NODE_TYPE=slave`
- 复用第一次部署出来的共享服务：
  - PostgreSQL
  - Redis
  - `SESSION_SECRET`
  - `CRYPTO_SECRET`

### 3. 面向模板维护
- 支持模板 YAML 预览与导出
- 支持 `template create`
- 支持 `template update`
- 保存模板 code 与部署历史

---

## 计划中的部署模式

MirrorZeabur 至少支持三种部署模式：

1. **single**
   - 单节点快速部署
   - app + postgres + redis

2. **cluster-master**
   - 首次集群主节点部署
   - app(`NODE_TYPE=master`) + postgres + redis
   - PostgreSQL / Redis 将作为后续节点共享基础设施

3. **cluster-slave**
   - 基于现有部署新增从节点
   - 只部署 app
   - app(`NODE_TYPE=slave`)
   - 复用已有 `SQL_DSN` / `REDIS_CONN_STRING` / secrets

---

## 文档结构

- `docs/technical-architecture.md`
  - MirrorZeabur 的技术架构设计
- `docs/zeabur-references.md`
  - Zeabur 官方资料与本地参考项目整理

---

## 参考项目 / 文档

### 本地参考项目

当前项目主要参考以下本地仓库与文件：

- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api`
  - 当前主要参考项目（New API）
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\zeabur.yaml`
  - 当前 Zeabur 模板参考实现
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\docker-compose.yml`
  - 服务栈、卷、端口、环境变量参考
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\.env.example`
  - 环境变量分组与默认值参考
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\init.go`
  - `NODE_TYPE`、`SESSION_SECRET`、`CRYPTO_SECRET`、`SYNC_FREQUENCY` 等集群语义参考
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\common\redis.go`
  - Redis 启用与同步逻辑参考
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\model\main.go`
  - `SQL_DSN` / `LOG_SQL_DSN`、master/slave migration 行为参考
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\README.md`
  - 多机部署与共享 Redis / Secret 说明参考
- `G:\Users\Administrator\Documents\AI\antigravity\NewAPI\new-api\docs\installation\BT.md`
  - 生产环境与多机部署环境变量说明参考

### 其他本地模板参考

- `G:\Users\Administrator\Documents\AI\antigravity\jiuzhou\jiuzhou\template.yaml`
  - 更完整的 Zeabur 模板写法参考（description / icon / tags / readme / instructions / expose / dependencies）

### Zeabur 官方资料（搜索整理）

- `https://zeabur.com/docs/en-US/template/template-format`
  - Zeabur 模板格式
- `https://schema.zeabur.app/template.json`
  - Zeabur 模板 JSON Schema
- `https://github.com/zeabur/zeabur-template-doc`
  - Zeabur 模板文档仓库 / 高质量模板参考
- `https://zeabur.com/docs/en-US/developer/public-api`
  - Zeabur Public API / GraphQL 入口说明

> 说明：本项目中的 Zeabur 资料来自检索与总结，不是复制外部文档全文。

---

## 当前范围（MVP）

MirrorZeabur 第一版建议聚焦：

1. GitHub 仓库输入 + 仓库 ID 自动获取
2. 部署模式选择（single / cluster-master / cluster-slave）
3. 参数表单与校验
4. `zeabur.yaml` 生成与预览
5. Zeabur CLI 登录 / 部署 / 发布 / 更新
6. 部署记录保存与后续扩容复用

---

## 后续建议

后续可以逐步增加：

- 更完善的日志面板
- 模板版本管理
- GraphQL API 执行器（替代 CLI 的部分交互式流程）
- 外部 PostgreSQL / Redis 切换向导
- 集群扩容助手
