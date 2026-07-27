---
title: "System Design: Skill Platform"
slug: "skill-platform"
pubDate: 2026-07-23
tags: ["Tech"]
---

### Step 1 - Understand the Problem and Establish Design Scope

#### 项目需求

所有 Skill 分散托管在不同仓库中，没有一套统一管理平台，各仓库独立维护自身 Skill 元数据、版本、使用文档、安装脚本。开发者想要查找可用 Skill，只能逐个进入对应代码仓库翻阅文档。没有统一工具来拉取、安装本地 Skill，分散仓库无法统一收集 Skill 下载量、使用频次、版本使用率等数据。各仓库安全校验标准不统一，部分 Skill 代码存在漏洞。同时还存在着codex，claude code等不同code agent安装skill的不统一性。

我们需要设计一套软件可以将不同分散仓库的skills统一起来，提供统一的网站让用户获取skills信息，同时构建cli包让用户可以在自己的终端安装想要的skills。平台提供对skill的安全检查，以及对不同用户不同skill下载权限进行管理。

#### Functional requirements

- 多仓库同步：拉取各仓库 Skill 元数据，仅存元数据不存源码
- Web 前端：Skill 搜索筛选、详情查看、安全报告、基础数据看板
- CLI 工具：登录、查看、安装 / 更新 / 卸载 Skill，下发数据源模板
- Code Agent 适配：统一 API 兼容 Codex、Claude Code 等工具查询下载 Skill
- 统一安全检测：同步时静态代码扫描，高危 Skill 禁止分发，留存审计日志
- 权限管控：区分管理员 / 维护者 / 开发者角色，私有 Skill 细粒度下载权限

#### Non-functional requirements

- Web 检索响应≤500ms，核心 API 响应≤150ms
- 系统峰值支持 1000 QPS(Queries Per Second)
- 所有接口统一鉴权，未授权请求拦截
- 代码扫描拦截恶意脚本、硬编码密钥
- 操作日志长期留存，满足安全审计
- 支持新增代码仓库接入，无需重构核心逻辑
- 可快速新增适配更多 AI Code Agent

#### Back-of-the-envelope estimation

我们先预估平台整体数据存量规模。平台计划接入约 20 个业务代码仓库，总计维护 2000 个独立 Skill，平均每个 Skill 拥有 3 个迭代版本，版本总数据条目达到 6000 条。每条 Skill 元数据大小约 5KB，全部元数据合计仅 30MB；每个版本会生成一份 20KB 的安全扫描报告，全部报告合计 120MB。平台会持续采集用户操作埋点日志，单条日志 200 字节，每日 10 万条操作记录，单月日志存储量约 60GB，日志统一留存 3 个月，日志总存储需求约 180GB，额外预留 5GB 对象存储空间用于存放文档附件与完整扫描报告。

接着估算平台整体流量与 QPS 并发压力。Web 网页端日均总访问量 5000 次，日常请求压力极低，访问高峰时段 QPS 不超过 50；CLI 终端工具与 Codex、Claude Code 等 AI 代码 Agent 会持续调用平台 API，日常平均 QPS 为 100，早晚开发使用高峰期峰值可达 300 QPS，平台 API 整体设计承载上限为 1000 QPS，预留充足并发冗余。除此之外平台存在定时后台任务，每日凌晨执行一次全量仓库 Skill 元数据同步，业务时段每 2 小时运行一轮增量同步任务。

最后对平台所需服务器硬件资源进行粗略估算。API 后端服务采用集群部署，配置 2 台 4 核 8G 服务器保障高可用；Web 前端静态页面服务部署 2 台 2 核 4G 机器；仓库元数据同步、代码安全扫描等耗时异步任务单独分配 1 台 4 核 16G 任务节点；数据库采用 MySQL 主从架构，单台数据库实例规格为 4 核 16G，足以支撑平台全部元数据、权限、用户配置等结构化数据存储需求。

### Step 2 - Propose High-Level Design 

#### High-level design

![High-Level Design](/images/skillshub-high-level-design.png)



#### API design

所有接口通过 `Authorization: Bearer <jwt_token>` 统一鉴权，核心接口响应 ≤150ms。

- **1. Skill 浏览**

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/skills` | 搜索 / 筛选 Skill 列表 |
| `GET` | `/api/v1/skills/:id` | Skill 详情（元数据、版本、安全报告） |
| `GET` | `/api/v1/skills/:id/versions` | Skill 全部版本列表 |

- **2. CLI 操作**

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/v1/skills/:id/install` | 安装 Skill，下发数据源模板 |
| `POST` | `/api/v1/skills/:id/update` | 更新 Skill 到指定版本 |
| `POST` | `/api/v1/skills/:id/uninstall` | 卸载 Skill |
| `GET` | `/api/v1/user/installed` | 当前用户已安装 Skill 列表 |

- **3. 安全报告**

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/skills/:id/reports` | Skill 安全扫描报告列表 |
| `GET` | `/api/v1/skills/:id/reports/:version` | 指定版本扫描报告详情 |
| `GET` | `/api/v1/admin/audit-logs` | (管理员) 审计日志查询 |

- **4. 统计看板**

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/skills/:id/stats` | 单个 Skill 下载量 / 版本使用率 |
| `GET` | `/api/v1/stats/dashboard` | 平台总览（总 Skill 数、总下载量等） |

- **5. 用户与权限**

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/user/profile` | 当前用户信息及角色 |
| `GET` | `/api/v1/admin/users` | (管理员) 用户列表 |
| `POST` | `/api/v1/admin/users/:id/role` | (管理员) 修改用户角色 |
| `POST` | `/api/v1/admin/skills/:id/permission` | (管理员) 设置私有 Skill 下载权限 |

- **6. 仓库管理**

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/repos` | (管理员) 已接入仓库列表 |
| `POST` | `/api/v1/admin/repos` | (管理员) 新增同步仓库 |
| `DELETE` | `/api/v1/admin/repos/:id` | (管理员) 移除仓库 |
| `POST` | `/api/v1/admin/repos/:id/sync` | (管理员) 手动触发全量同步 |

### Step 3 - Design Deep Dive

#### 1. 多仓库同步机制

平台需要接入多种外部仓库（GitHub、GitLab、内部 Git 服务），核心原则是**只拉取元数据，不存储源码**。Sync Worker 从仓库中读取 Skill 的描述文件（如 `skill.yaml`），解析后写入 Skill DB Primary，源码 URL 保留在元数据中供 CLI 安装时按需拉取。

- **同步策略**

| 类型 | 触发方式 | 频率 | 说明 |
|------|---------|------|------|
| 全量同步 | Cron 定时 | 每日凌晨 | 遍历所有接入仓库，拉取全部 Skill 元数据 |
| 增量同步 | Cron 定时 | 每 2 小时 | 仅拉取自上次同步后有变更的仓库 (基于 commit hash 比对) |
| 手动同步 | 管理员触发 | 按需 | 通过 `POST /api/v1/admin/repos/:id/sync` 触发 |

- **同步流程**

1. **Cron Scheduler** 按配置频率向 Message Queue 投递同步 Job
2. **Sync Worker** 消费 Job，逐个仓库执行 `git pull` / `git clone`（仅克隆 `--depth=1` 或按 tag 增量）
3. 遍历仓库中的 Skill 描述文件，校验格式合法性
4. 将解析后的元数据（名称、版本、描述、标签、入口 URL 等）写入 Skill DB Primary
5. 同步完成后向 Message Queue 投递 **安全扫描 Job**，触发 Security Scanner
6. 同步结果（成功 / 失败 / 新增 / 变更数量）写入操作日志

- **元数据标准化**

为统一不同仓库的 Skill 描述格式，约定一份标准的 `skill.yaml` schema：

```yaml
name: my-skill
description: A helpful coding skill
version: 1.2.0
author:
  name: maintainer-name
  email: dev@example.com
tags: [python, linting]
homepage: https://github.com/example/my-skill
source: https://github.com/example/my-skill.git
entry:
  install: ./install.sh
  main: skill.py
```

Sync Worker 负责将各仓库的 `skill.yaml` 统一解析到上述 schema，不兼容的仓库需维护者适配后方可接入。

#### 2. 安全扫描流水线

每个 Skill 在元数据同步完成后都会被自动投递到安全扫描流水线，由 Security Scanner 消费 Message Queue 中的扫描 Job 执行静态代码分析。扫描结果直接影响 Skill 的分发状态。

- **扫描维度**

| 检测项 | 说明 | 
|--------|------|
| 恶意脚本 | 检测 `exec`、`eval`、`os.system`、`subprocess` 等危险调用模式 | 
| 硬编码密钥 | 正则匹配 API Key、Token、密码等敏感字符串 | 
| 网络外连 | 检测向外部未知地址的请求代码 | 
| 文件操作 | 检测敏感路径读写（`/etc/passwd`、`~/.ssh` 等） | 
| 依赖漏洞 | 解析 `requirements.txt` / `package.json` 等，调用漏洞库比对已知 CVE | 

- **扫描流程**

1. Message Queue 投递扫描 Job（含 Skill ID + 版本号 + 源码 URL）
2. **Security Scanner** 从源码 URL 拉取代码到**沙箱容器**中
3. 运行静态分析规则引擎（AST 解析 + 正则匹配 + 依赖漏洞比对）
4. 生成扫描报告，写入 **Skill DB Primary**（扫描状态、风险等级、详情）
5. 完整报告 PDF/JSON 存入 **Object Storage**，供前端下载查看
6. 若判定为高危，将 Skill 标记为 `blocked`，前端不可见、CLI 不可安装
7. 所有扫描操作写入审计日志

- **沙箱隔离**

Security Scanner 在独立的**沙箱容器**中执行代码分析，容器具备以下限制：

- 无网络访问权限（除白名单镜像源）
- 只读文件系统挂载
- CPU / 内存资源上限限制
- 超时自动终止（单 Skill 最长 60 秒）
- 扫描完成后容器自动销毁

- **审计日志**

所有安全相关操作记录留存，支持按时间、Skill、操作类型检索：

| 日志字段 | 说明 |
|---------|------|
| `timestamp` | 操作时间 |
| `skill_id` | Skill ID |
| `action` | 操作类型：scan / block / unblock / override |
| `operator` | 操作人（系统自动 / 管理员） |
| `detail` | 详情：扫描结果摘要、风险等级变更等 |

#### 3. CLI 安装流程

CLI 工具是用户获取 Skill 的主要入口，提供登录、浏览、安装、更新、卸载一站式操作。

**安装步骤：**

1. CLI 发起 `POST /api/v1/skills/:id/install`，携带 JWT Token
2. API Gateway 校验身份后转发请求至 Skill Service
3. Skill Service 检查用户对该 Skill 的下载权限
4. 权限通过后，从 Skill DB 读取元数据与安装脚本，从 Object Storage 获取数据源模板
5. 将模板及安装脚本组装返回给 CLI
6. CLI 本地执行 `install.sh`，`git clone` 源码到本地，完成后上报安装统计

**更新与卸载**同理，CLI 调用对应 API 获取新版本信息或执行卸载脚本。可通过 `GET /api/v1/user/installed` 批量查看已安装 Skill 及可更新版本。

- **更新检测**

CLI 本地记录已安装 Skill 的当前版本。每次执行 `update` 命令时，CLI 向服务端查询最新版本号，若不一致则拉取新版本模板并更新。也可通过定时轮询 `GET /api/v1/user/installed` 批量检测更新。

