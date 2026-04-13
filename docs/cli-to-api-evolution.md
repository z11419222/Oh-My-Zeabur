# MirrorZeabur：CLI 执行到 API / GraphQL 执行的演进图

## 1. 文档目的

本文档用于记录 MirrorZeabur 当前执行架构与未来演进方向，帮助后续开发时明确：

- 为什么当前阶段使用 Zeabur CLI
- CLI 架构的边界在哪里
- 未来什么时候、为什么要切到 API / GraphQL

---

## 2. 当前阶段：CLI 驱动执行

当前 MirrorZeabur 的真实执行链路为：

```text
GUI 表单
  ↓
DeploymentConfig
  ↓
生成 mz.yaml
  ↓
Tauri command
  ↓
npx zeabur auth login --token <API_KEY>
  ↓
npx zeabur template deploy -f <temp.yaml>
  ↓
stdout / stderr / message 回显到 UI
```

### 当前优点

1. 与官方 CLI 工作流一致
2. 实现成本低，适合 MVP
3. 不需要猜测未公开的 GraphQL mutation 细节
4. 可以较快验证产品主链

### 当前局限

1. 错误输出主要是文本，结构化程度不高
2. 进度状态不是后端真实任务状态，只是前端阶段流
3. 批量执行依赖串行 CLI，调度能力有限
4. 安全模型受限于本地 CLI 登录方式
5. 对 CLI 行为和版本变化比较敏感

---

## 3. 当前架构图

```text
┌───────────────────────┐
│      MirrorZeabur     │
│   React + Tauri UI    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   Tauri Command Layer │
│ validate / deploy     │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│      Zeabur CLI       │
│ auth login / deploy   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│     Zeabur Service    │
└───────────────────────┘
```

---

## 4. 下一阶段：CLI + 更强任务编排

在完全切到 API / GraphQL 之前，MirrorZeabur 会先经历一个过渡阶段：

```text
GUI 表单
  ↓
DeploymentConfig
  ↓
任务模型（Task / BatchTask）
  ↓
Tauri 执行器
  ↓
CLI 串行 / 批量执行
  ↓
结构化任务结果写入本地状态
```

### 目标

1. 更明确的任务状态机
2. 更细粒度的失败分类
3. 更好的批量调度体验
4. 更好的历史记录与结果追踪

这一步的意义是：

> 即使还没切到 API，产品体验也能先从“调用命令”升级到“有任务系统的桌面工具”。

---

## 5. 未来阶段：直接 API / GraphQL 执行

未来理想形态如下：

```text
GUI 表单
  ↓
DeploymentConfig
  ↓
Template / Deploy Request Builder
  ↓
Zeabur API / GraphQL Client
  ↓
创建部署任务 / 查询任务状态 / 获取结果
  ↓
结构化结果驱动 UI
```

### API / GraphQL 模式的优势

1. 结果结构化，便于任务中心与状态展示
2. 更适合 GUI 的批量与并发调度
3. 可以获得更真实的后端任务状态
4. 不依赖本地 CLI 行为和文本输出格式
5. 更适合做账号体系、项目管理和高阶运维能力

### API / GraphQL 模式的代价

1. 开发和维护成本更高
2. 需要更清晰的认证与权限模型
3. 需要研究 Zeabur 公开接口与 mutation 能力边界
4. 如果接口不稳定，维护成本会上升

---

## 6. 演进图

```text
阶段 A：MVP（已实现）
GUI → YAML → Tauri → Zeabur CLI

阶段 B：可用版（建议进行中）
GUI → Deployment Task → Tauri Executor → Zeabur CLI

阶段 C：平台化执行层（未来）
GUI → Structured Request Builder → Zeabur API / GraphQL → Task State
```

---

## 7. 什么时候应该考虑切 API / GraphQL

当以下需求越来越强时，应开始评估切换：

1. 需要真实任务进度，而不是本地阶段提示
2. 需要更强的批量 / 并发部署调度
3. 需要项目 / 服务 / 部署状态的结构化查询
4. 需要更专业的账号与权限体系
5. 需要摆脱对本地 CLI 的依赖

---

## 8. 当前结论

### 当前阶段
继续使用 **CLI 驱动执行** 是合理的。

### 原因
1. 更快交付
2. 风险更低
3. 当前主链已经跑通
4. 现在更需要的是“把产品做稳”，而不是过早重构底层执行方式

### 下一步优先级
1. 完善任务系统
2. 完善本地安全存储
3. 再评估是否切 API / GraphQL
