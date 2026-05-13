# 基金守护者 - 部署手册

## 项目概述

基金守护者是一个基于NestJS后端和Vue3前端的基金投资分析平台，提供基金监控、AI分析报告生成等功能。

## 系统架构

### 技术栈
- **后端**: NestJS (Node.js框架)
- **前端**: Vue3 + Vite + UniApp
- **数据库**: PostgreSQL
- **AI服务**: DeepSeek API
- **部署平台**: Render (后端) + Vercel (前端)

### 目录结构
```
d:\myCode\jijin
├── agent-server/     # 后端服务
├── fund-guardian/    # 前端应用
├── DEPLOYMENT_*.md   # 部署文档
└── README.md         # 项目说明
```

## 部署前准备

### 1. 环境要求
- Node.js >= 18.x
- npm >= 8.x
- PostgreSQL >= 14.x
- Git

### 2. 必要账户
- Render账户 (用于后端部署)
- Vercel账户 (用于前端部署)
- GitHub账户 (代码托管)
- DeepSeek API密钥 (AI服务)

## 详细部署步骤

### 后端部署 (Render)

#### 1. 代码准备
确保 `agent-server` 目录包含：
- `package.json` - 项目依赖和脚本
- `Dockerfile` - Docker镜像构建配置
- `docker-compose.yml` - 本地开发环境配置
- `.env.example` - 环境变量模板
- 完整的源代码

#### 2. 环境变量配置
创建 `.env.production` 并配置：
- 数据库连接信息
- JWT密钥
- DeepSeek API密钥
- CORS配置

#### 3. 部署流程
1. 连接GitHub仓库到Render
2. 选择 `agent-server` 目录
3. 设置部署参数（端口3000，Docker环境）
4. 添加环境变量
5. 部署服务

#### 4. 数据库设置
1. 在Render创建PostgreSQL数据库
2. 获取连接字符串
3. 更新环境变量
4. 重新部署以应用数据库配置

### 前端部署 (Vercel)

#### 1. 代码准备
确保 `fund-guardian` 目录包含：
- `package.json` - 项目依赖和脚本
- `vite.config.ts` - Vite构建配置
- `vercel.json` - Vercel部署配置
- `.env.example` - 环境变量模板
- 完整的源代码

#### 2. 环境变量配置
创建 `.env.production` 并配置：
- 后端API URL
- 前端基础URL
- 应用名称和版本
- 调试模式设置

#### 3. 部署流程
1. 导入GitHub仓库到Vercel
2. 选择 `fund-guardian` 目录
3. 设置构建参数（Vite框架）
4. 添加环境变量
5. 部署项目

## 配置详解

### 后端配置

#### 数据库配置
```env
DB_TYPE=postgres
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=fundguardian
```

#### JWT配置
```env
JWT_SECRET=your-secure-jwt-secret-key
JWT_EXPIRES_IN=7d
```

#### AI服务配置
```env
LLM_PROVIDER=deepseek
LLM_API_KEY=your-deepseek-api-key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
```

### 前端配置

#### API配置
```env
VITE_API_BASE_URL=https://your-agent-server.onrender.com
VITE_BASE_URL=https://your-frontend-url.vercel.app
```

#### 应用配置
```env
VITE_APP_NAME=基金守护者
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
```

## 部署验证

### 健康检查
- 后端: `GET /health`
- 前端: 访问部署URL

### 功能测试
1. 用户注册和登录
2. 基金数据获取
3. AI分析报告生成
4. 数据可视化

## 监控和维护

### 日志查看
- **Render**: 控制台日志查看
- **Vercel**: 函数日志查看

### 性能监控
- API响应时间
- 数据库查询性能
- 前端加载速度

### 定期维护
- 数据库备份
- 依赖更新
- 安全补丁应用

## 故障排除

### 常见问题及解决方案

#### 数据库连接问题
- 检查连接字符串格式
- 验证用户名和密码
- 确认网络连通性

#### CORS配置问题
- 检查CORS_ORIGIN设置
- 确认域名匹配
- 验证HTTP方法允许

#### API密钥问题
- 验证密钥有效性
- 检查API调用限制
- 确认计费状态

## 安全考虑

### 数据安全
- 使用HTTPS
- 数据库连接加密
- JWT安全存储

### 访问控制
- 用户认证和授权
- API访问限制
- 敏感数据保护

## 扩展和优化

### 性能优化
- 数据库索引优化
- 缓存机制
- CDN加速

### 功能扩展
- 更多基金数据源
- 高级分析功能
- 用户个性化设置

## 联系信息

如有部署问题，请联系开发团队：
- 邮箱: support@fundguardian.com
- 文档: https://docs.fundguardian.com