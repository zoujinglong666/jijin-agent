# Fund Guardian - 基金持仓守护系统

基金持仓分析与风险预警系统，通过行为分析、情绪监控和AI智能洞察，帮助投资者理性管理基金投资组合。

## 项目结构

```
jijin/
├── agent-server/          # NestJS 后端服务
│   ├── src/
│   │   ├── common/        # 公共模块（异常、拦截器、常量、类型）
│   │   ├── database/      # 数据库配置与实体
│   │   └── modules/       # 业务模块
│   │       ├── auth/      # 认证授权（JWT + bcrypt）
│   │       ├── portfolio/ # 持仓管理（CRUD + 板块分析）
│   │       ├── behavior/  # 行为分析（事件记录 + 人格画像）
│   │       ├── risk/      # 风险评估（综合评分 + 压力测试）
│   │       ├── regret/    # 后悔模拟（三种反事实场景）
│   │       ├── growth/    # 成长指标
│   │       ├── news/      # 新闻事件（自动抓取 + 板块匹配）
│   │       ├── llm/       # LLM 调用（DeepSeek API）
│   │       ├── chat/      # AI 对话（流式 SSE 响应）
│   │       └── agent/     # Agent 循环（定时风险扫描）
│   ├── test/              # E2E 集成测试
│   └── init-database.sql  # 数据库初始化脚本
├── fund-guardian/         # uni-app Vue3 前端
└── README.md
```

## 技术栈

### 后端
- **框架**: NestJS 10 + TypeScript
- **数据库**: PostgreSQL 16 + TypeORM
- **认证**: JWT + bcrypt (salt rounds: 12)
- **限流**: @nestjs/throttler (3层限流策略)
- **定时任务**: @nestjs/schedule (Agent 5分钟循环)
- **日志**: Winston + nest-winston
- **LLM**: DeepSeek API (流式 SSE)
- **测试**: Jest + @nestjs/testing + supertest

### 前端
- **框架**: uni-app + Vue3 + Vite
- **状态管理**: Pinia
- **构建**: Vite

## 快速开始

### 前置条件
- Node.js >= 18
- PostgreSQL >= 14 (端口5433)
- npm

### 1. 数据库准备

```bash
# 创建数据库
psql -U postgres -p 5433 -c "CREATE DATABASE fundguardian;"

# 或使用初始化脚本
psql -U postgres -p 5433 -d fundguardian -f agent-server/init-database.sql
```

> 注意：开发模式下 TypeORM `synchronize: true` 会自动创建表结构，SQL文件用于生产环境初始化。

### 2. 后端启动

```bash
cd agent-server
cp .env.example .env   # 编辑 .env 配置数据库连接和 LLM API Key
npm install
npm run start:dev
```

服务运行在 http://localhost:3000

### 3. 前端启动

```bash
cd fund-guardian
npm install
npm run dev:h5
```

前端运行在 http://localhost:5173

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DB_TYPE | 数据库类型 | postgres |
| DB_HOST | 数据库主机 | localhost |
| DB_PORT | 数据库端口 | 5433 |
| DB_USERNAME | 数据库用户 | postgres |
| DB_PASSWORD | 数据库密码 | 123456 |
| DB_DATABASE | 数据库名 | fundguardian |
| DB_SYNC | 自动同步表结构 | true |
| JWT_SECRET | JWT密钥 | - |
| JWT_EXPIRES_IN | Token有效期 | 7d |
| LLM_API_KEY | DeepSeek API Key | - |
| LLM_BASE_URL | LLM API地址 | https://api.deepseek.com |
| LLM_MODEL | LLM模型 | deepseek-v4-pro |
| PORT | 服务端口 | 3000 |

## API 接口

所有接口前缀: `/api`

### 公共接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /auth/register | 用户注册 |
| POST | /auth/login | 用户登录 |

### 需要认证 (Bearer Token)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /auth/profile | 获取用户信息 |
| POST | /auth/settings | 更新用户设置 |
| GET | /portfolio/funds | 获取持仓列表 |
| POST | /portfolio/funds | 添加持仓 |
| PUT | /portfolio/funds/:id | 更新持仓 |
| DELETE | /portfolio/funds/:id | 删除持仓 |
| GET | /portfolio/analysis | 持仓分析 |
| POST | /portfolio/import | 批量导入 |
| POST | /behavior/events | 记录行为事件 |
| GET | /behavior/state | 行为状态 |
| GET | /behavior/personality | 投资人格 |
| GET | /behavior/tags | 行为标签 |
| GET | /risk/snapshot | 风险快照 |
| GET | /risk/alerts | 风险告警 |
| GET | /risk/scenarios | 压力测试场景 |
| POST | /risk/stress-test | 执行压力测试 |
| GET | /regret/scenarios | 后悔模拟场景 |
| POST | /regret/simulate | 执行模拟 |
| GET | /growth/metrics | 成长指标 |
| PUT | /growth/metrics | 更新成长指标 |
| POST | /chat/message | AI对话(SSE流式) |

## 测试

```bash
cd agent-server

# 单元测试
npm test

# 单元测试(带覆盖率)
npm run test:cov

# E2E集成测试
npm run test:e2e
```

### 测试覆盖模块
- **common**: Result类、BizException异常类
- **auth**: 密码强度验证、注册、登录、JWT认证
- **portfolio**: 持仓CRUD、板块比例、高波动比例
- **behavior**: 行为状态、投资人格、行为标签
- **risk**: 风险评分、压力测试、风险告警
- **regret**: 三种后悔模拟场景
- **growth**: 成长指标CRUD
- **news**: 事件影响计算

## 核心业务逻辑

### 风险评分算法
综合评分 = 集中度(40%) + 波动性(30%) + 行为(20%) + 事件(10%)

- **safe**: score < 40
- **warning**: 40 <= score < 70
- **danger**: score >= 70

### 投资人格分类
1. 主题赌徒型 - 单赛道集中度 > 60%
2. 情绪敏感型 - 7天查看账户 > 20次
3. 激进成长型 - 高波动资产 > 70%
4. 长期持有型 - 近7天无操作
5. 分散安全型 - 安全资产 > 50%
6. 均衡配置型 - 默认类型

### 行为评分
24小时窗口内: APP_OPEN(0.3) + PORTFOLIO_VIEW(0.3) + REFRESH(0.2) + SIMULATE_SELL(0.2)

### 错误码体系
- 1xxxx: 通用错误
- 2xxxx: 认证授权错误
- 3xxxx: 业务逻辑错误
- 4xxxx: 外部服务错误