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
- 系统峰值支持 1000 QPS
- 所有接口统一鉴权，未授权请求拦截
- 代码扫描拦截恶意脚本、硬编码密钥
- 操作日志长期留存，满足安全审计
- 支持新增代码仓库接入，无需重构核心逻辑
- 可快速新增适配更多 AI Code Agent


#### Back-of-the-envelope estimation


### Step 2 - Propose High-Level Design 

#### High-level design




#### API design

### Step 3 - Design Deep Dive