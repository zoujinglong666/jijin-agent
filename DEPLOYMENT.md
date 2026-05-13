# Fund Guardian 部署指南

## 免费部署方案

### 1. 后端部署到 Render (免费)

Render 提供免费 PostgreSQL 数据库和 Web 服务部署。

#### 步骤：

1. **注册 Render 账号**
   - 访问 https://render.com
   - 使用 GitHub 账号注册

2. **准备代码**
   - 将代码推送到 GitHub 仓库
   - 确保包含 `agent-server` 目录下的所有文件

3. **创建 Web Service**
   - 在 Render Dashboard 点击 "New Web Service"
   - 连接你的 GitHub 仓库
   - 选择 `agent-server` 目录
   - 配置：
     - **Name**: fund-guardian-api
     - **Environment**: Node
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm run start:prod`
     - **Environment Variables**:
       ```
       NODE_ENV=production
       PORT=3000
       DB_TYPE=postgres
       DB_HOST=your-render-db-host
       DB_PORT=5432
       DB_USERNAME=your-db-username
       DB_PASSWORD=your-db-password
       DB_DATABASE=your-db-name
       DB_SYNC=false
       JWT_SECRET=your-secure-jwt-secret
       JWT_EXPIRES_IN=7d
       LLM_PROVIDER=deepseek
       LLM_API_KEY=your-deepseek-api-key
       LLM_BASE_URL=https://api.deepseek.com
       LLM_MODEL=deepseek-v4-pro
       CORS_ORIGIN=https://your-frontend-domain.com
       ```

4. **创建 PostgreSQL 数据库**
   - 在 Render Dashboard 点击 "New PostgreSQL"
   - 选择免费计划
   - 获取连接信息后填入上面环境变量

### 2. 前端部署到 Vercel (免费)

Vercel 提供免费的前端静态网站托管。

#### 步骤：

1. **注册 Vercel 账号**
   - 访问 https://vercel.com
   - 使用 GitHub 账号注册

2. **准备代码**
   - 确保包含 `fund-guardian` 目录下的所有文件
   - 更新 `fund-guardian/.env.production`：
     ```
     VITE_API_BASE_URL=https://your-render-api-url.com
     VITE_APP_NAME=小基助手
     ```

3. **创建项目**
   - 在 Vercel Dashboard 点击 "New Project"
   - 连接你的 GitHub 仓库
   - 选择 `fund-guardian` 目录
   - 配置：
     - **Framework**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

4. **环境变量**
   - 在 Project Settings -> Environment Variables 中添加：
     ```
     VITE_API_BASE_URL=https://your-render-api-url.com
     VITE_APP_NAME=小基助手
     ```

### 3. 替代方案：Railway (免费)

Railway 也提供免费部署选项：

#### 后端部署：

1. **注册 Railway 账号**
   - 访问 https://railway.app
   - 使用 GitHub 账号注册

2. **创建项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你的仓库和 `agent-server` 目录
   - 添加 PostgreSQL 服务
   - 配置环境变量（同 Render）

#### 前端部署：

1. **创建静态网站服务**
   - 在 Railway 中添加新服务
   - 选择 "Static Site"
   - 配置构建命令和环境变量（同 Vercel）

## 注意事项

### 环境变量配置

- **开发环境**：使用 `.env` 文件
- **生产环境**：在部署平台设置环境变量
- **敏感信息**：不要在代码中硬编码 API 密钥

### 免费套餐限制

- **Render**：每月 750 小时免费运行时间，512MB RAM
- **Vercel**：每月 100GB 带宽，免费 SSL 证书
- **Railway**：每月 500 小时免费运行时间，1GB RAM

### 域名配置

1. **自定义域名**：
   - 在 Vercel 和 Render 中配置自定义域名
   - 更新 DNS 记录指向部署平台

2. **HTTPS**：
   - 所有平台都提供自动 SSL 证书

### 数据库迁移

首次部署时，需要手动运行数据库迁移：

```bash
npm run migration:run
```

或在部署后通过 SSH 连接执行。

### 监控和日志

- **Render**：提供实时日志查看
- **Vercel**：提供构建和运行时日志
- **Railway**：提供应用日志和性能监控

## 部署后配置

### 1. 更新前端 API 地址

部署完成后，更新 `fund-guardian/.env.production` 中的 `VITE_API_BASE_URL` 为实际的后端地址。

### 2. 配置 CORS

确保后端 `CORS_ORIGIN` 环境变量包含前端域名。

### 3. 测试部署

访问前端域名，测试以下功能：
- 用户注册/登录
- 基金持仓管理
- AI 对话功能
- 风险分析

## 成本优化建议

1. **使用免费额度**：充分利用各平台的免费额度
2. **静态资源优化**：压缩图片，使用 CDN
3. **API 缓存**：实现简单的缓存机制减少 API 调用
4. **数据库优化**：添加索引，优化查询

## 技术支持

如果遇到部署问题，可以：
1. 查看平台文档
2. 检查环境变量配置
3. 查看应用日志
4. 在 GitHub 提交 issue