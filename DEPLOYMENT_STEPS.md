# 基金守护者 - 部署步骤指南

## 概述
本文档提供了将基金守护者应用部署到 Render（后端）和 Vercel（前端）的详细步骤。

## 后端部署到 Render

### 1. 准备后端代码

1. 确保 `agent-server` 目录包含以下文件：
   - `package.json`
   - `Dockerfile`
   - `docker-compose.yml`
   - `.env.example`（已更新为生产环境配置）

2. 创建 `.env.production` 文件：
   ```bash
   cd agent-server
   cp .env.example .env.production
   ```

3. 编辑 `.env.production` 文件，填入实际的生产环境配置：
   - 数据库连接信息（来自Render的PostgreSQL服务）
   - JWT密钥
   - DeepSeek API密钥

### 2. 部署到Render

1. 访问 [Render](https://render.com) 并登录
2. 创建新的 Web Service
3. 选择 GitHub 仓库并连接到 `agent-server` 目录
4. 配置部署设置：
   - 环境：Docker
   - 端口：3000
   - 环境变量：在Render控制台中添加 `.env.production` 中的所有变量
5. 部署服务

### 3. 创建PostgreSQL数据库

1. 在Render控制台中创建新的PostgreSQL数据库
2. 获取数据库连接信息
3. 更新 `.env.production` 中的数据库配置
4. 重新部署后端服务

## 前端部署到 Vercel

### 1. 准备前端代码

1. 确保 `fund-guardian` 目录包含以下文件：
   - `package.json`
   - `vite.config.ts`
   - `vercel.json`
   - `.env.example`（已更新为生产环境配置）

2. 创建 `.env.production` 文件：
   ```bash
   cd fund-guardian
   cp .env.example .env.production
   ```

3. 编辑 `.env.production` 文件：
   - 将 `VITE_API_BASE_URL` 设置为Render部署的后端URL
   - 将 `VITE_BASE_URL` 设置为Vercel部署的前端URL
   - 设置 `VITE_DEBUG=false`

### 2. 部署到Vercel

1. 访问 [Vercel](https://vercel.com) 并登录
2. 导入 GitHub 仓库
3. 选择 `fund-guardian` 目录
4. 配置部署设置：
   - 框架预设：Vite
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 环境变量：在Vercel控制台中添加 `.env.production` 中的所有变量
5. 部署项目

## 配置验证

### 1. 验证后端API

部署完成后，测试以下端点：
- `GET /health` - 健康检查
- `POST /auth/login` - 用户登录
- `GET /api/funds` - 获取基金列表

### 2. 验证前端应用

访问Vercel部署的前端URL，验证：
- 用户注册和登录功能
- 基金数据展示
- AI分析报告生成

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查数据库URL格式
   - 验证用户名和密码
   - 确保数据库服务正在运行

2. **CORS错误**
   - 检查 `.env.production` 中的 `CORS_ORIGIN` 设置
   - 确保前端URL已正确添加到后端CORS白名单

3. **API密钥无效**
   - 验证DeepSeek API密钥
   - 检查API调用限制

### 日志查看

- **Render**: 在Render控制台查看服务日志
- **Vercel**: 在Vercel控制台查看函数日志

## 后续步骤

1. 配置自定义域名
2. 设置SSL证书
3. 配置监控和告警
4. 定期备份数据库