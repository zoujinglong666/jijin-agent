-- ============================================================
-- Fund Guardian 数据库初始化脚本
-- 数据库: PostgreSQL 16
-- 与 TypeORM 实体定义保持一致
-- ============================================================

-- 启用 uuid-ossp 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 用户表 (users)
-- ============================================================
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email varchar(100) UNIQUE NOT NULL,
    password varchar(255) NOT NULL,
    riskPreference varchar(50) DEFAULT 'balanced',
    isActive boolean DEFAULT true,
    behaviorTrackingEnabled boolean DEFAULT true,
    dailyReportEnabled boolean DEFAULT true,
    llmModel varchar(50) DEFAULT 'deepseek-v4-pro',
    createdAt TIMESTAMP DEFAULT now(),
    updatedAt TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 2. 基金持仓表 (funds)
-- ============================================================
CREATE TABLE funds (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId uuid NOT NULL,
    name varchar(100) NOT NULL,
    code varchar(20) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    profitRate DECIMAL(8,4) DEFAULT 0,
    sector varchar(20) NOT NULL,
    accountId varchar(50),
    createdAt TIMESTAMP DEFAULT now(),
    updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_funds_userId ON funds(userId);
CREATE INDEX IDX_funds_userId_sector ON funds(userId, sector);

-- ============================================================
-- 3. 行为日志表 (behavior_logs)
-- ============================================================
CREATE TABLE behavior_logs (
    id SERIAL PRIMARY KEY,
    userId uuid NOT NULL,
    eventType varchar(30) NOT NULL,
    payload text,
    createdAt TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_behavior_logs_userId ON behavior_logs(userId);
CREATE INDEX IDX_behavior_logs_userId_eventType ON behavior_logs(userId, eventType);

-- ============================================================
-- 4. 操作记录表 (action_records)
-- ============================================================
CREATE TABLE action_records (
    id SERIAL PRIMARY KEY,
    userId uuid NOT NULL,
    fundId varchar(50) NOT NULL,
    actionType varchar(20) NOT NULL,
    ratio DECIMAL(5,2) DEFAULT 0,
    reason text,
    createTime TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_action_records_userId ON action_records(userId);
CREATE INDEX IDX_action_records_userId_createTime ON action_records(userId, createTime);

-- ============================================================
-- 5. 风险快照表 (risk_snapshots)
-- ============================================================
CREATE TABLE risk_snapshots (
    id SERIAL PRIMARY KEY,
    userId uuid NOT NULL,
    score integer NOT NULL,
    level varchar(20) NOT NULL,
    sectorConcentration DECIMAL(8,2) DEFAULT 0,
    marketVolatility DECIMAL(8,2) DEFAULT 0,
    behaviorScore DECIMAL(8,2) DEFAULT 0,
    eventImpact DECIMAL(8,2) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_risk_snapshots_userId ON risk_snapshots(userId);
CREATE INDEX IDX_risk_snapshots_userId_createdAt ON risk_snapshots(userId, createdAt);

-- ============================================================
-- 6. 情绪历史表 (emotion_history)
-- ============================================================
CREATE TABLE emotion_history (
    id SERIAL PRIMARY KEY,
    userId uuid NOT NULL,
    score integer NOT NULL,
    level varchar(20) NOT NULL,
    trend varchar(20) NOT NULL,
    createdAt TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_emotion_history_userId ON emotion_history(userId);
CREATE INDEX IDX_emotion_history_userId_createdAt ON emotion_history(userId, createdAt);

-- ============================================================
-- 7. 新闻事件表 (news_events)
-- ============================================================
CREATE TABLE news_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title varchar(255) NOT NULL,
    content text,
    source varchar(100),
    relatedSectors text NOT NULL,
    impactLevel varchar(10) DEFAULT 'low',
    createdAt TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_news_events_relatedSectors ON news_events(relatedSectors);

-- ============================================================
-- 8. Agent输出记录表 (agent_outputs)
-- ============================================================
CREATE TABLE agent_outputs (
    id SERIAL PRIMARY KEY,
    userId uuid NOT NULL,
    insight text NOT NULL,
    riskExplanation text NOT NULL,
    behaviorInsight text NOT NULL,
    emotionInsight text NOT NULL,
    shouldNotify boolean DEFAULT false,
    importance DECIMAL(3,2) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_agent_outputs_userId ON agent_outputs(userId);
CREATE INDEX IDX_agent_outputs_userId_createdAt ON agent_outputs(userId, createdAt);

-- ============================================================
-- 9. 成长指标表 (growth_metrics)
-- ============================================================
CREATE TABLE growth_metrics (
    id SERIAL PRIMARY KEY,
    userId varchar(36) NOT NULL,
    stableDays integer DEFAULT 0,
    riskControlRate float DEFAULT 0,
    emotionStability float DEFAULT 0,
    longTermHoldIndex float DEFAULT 0,
    createdAt TIMESTAMP DEFAULT now(),
    updatedAt TIMESTAMP DEFAULT now()
);

CREATE INDEX IDX_growth_metrics_userId ON growth_metrics(userId);
CREATE INDEX IDX_growth_metrics_userId_col ON growth_metrics(userId);