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

### Step 3 - Design Deep Dive

