import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBehaviorTracking20240515000000 implements MigrationInterface {
  name = 'AddBehaviorTracking20240515000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建行为日志表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "behavior_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(50) NOT NULL,
        "eventType" character varying(50) NOT NULL,
        "fundCode" character varying(100),
        "eventData" character varying(200),
        "amount" numeric(10, 2),
        "metadata" json,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_behavior_logs" PRIMARY KEY ("id")
      )
    `);

    // 创建行为日志索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_behavior_logs_userId_createdAt" ON "behavior_logs" ("userId", "createdAt")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_behavior_logs_eventType_createdAt" ON "behavior_logs" ("eventType", "createdAt")
    `);

    // 创建操作记录表
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "action_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying(50) NOT NULL,
        "actionType" character varying(50) NOT NULL,
        "fundCode" character varying(100),
        "fundName" character varying(100) NOT NULL,
        "amount" numeric(10, 2),
        "units" numeric(10, 2),
        "price" numeric(10, 4),
        "previousAmount" numeric(10, 2),
        "previousUnits" numeric(10, 2),
        "reason" character varying(50),
        "note" text,
        "metadata" json,
        "createTime" TIMESTAMP NOT NULL DEFAULT now(),
        "updateTime" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_action_records" PRIMARY KEY ("id")
      )
    `);

    // 创建操作记录索引
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_action_records_userId_createTime" ON "action_records" ("userId", "createTime")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_action_records_actionType_createTime" ON "action_records" ("actionType", "createTime")
    `);

    // 更新用户表，添加同步和行为分析相关字段
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "syncplatform" character varying(20),
      ADD COLUMN IF NOT EXISTS "lastsynctime" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "synctoken" character varying(500),
      ADD COLUMN IF NOT EXISTS "synctokenexpiry" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "notificationpreferences" json,
      ADD COLUMN IF NOT EXISTS "interventionenabled" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "monthlyreportenabled" boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS "alertthreshold" numeric(8, 4) DEFAULT 0.05
    `);

    // 更新基金表，添加同步和行为分析相关字段
    await queryRunner.query(`
      ALTER TABLE "funds" 
      ADD COLUMN IF NOT EXISTS "fundCode" character varying(20),
      ADD COLUMN IF NOT EXISTS "currentValue" numeric(15, 2),
      ADD COLUMN IF NOT EXISTS "marketValue" numeric(15, 2),
      ADD COLUMN IF NOT EXISTS "syncPlatform" character varying(20),
      ADD COLUMN IF NOT EXISTS "lastSyncTime" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "targetAllocation" numeric(8, 4),
      ADD COLUMN IF NOT EXISTS "actualAllocation" numeric(8, 4),
      ADD COLUMN IF NOT EXISTS "deviation" numeric(8, 4),
      ADD COLUMN IF NOT EXISTS "costBasis" numeric(15, 2),
      ADD COLUMN IF NOT EXISTS "volatility" numeric(8, 4)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除基金表的新增字段
    await queryRunner.query(`
      ALTER TABLE "funds" 
      DROP COLUMN IF EXISTS "volatility",
      DROP COLUMN IF EXISTS "costBasis",
      DROP COLUMN IF EXISTS "deviation",
      DROP COLUMN IF EXISTS "actualAllocation",
      DROP COLUMN IF EXISTS "targetAllocation",
      DROP COLUMN IF EXISTS "lastSyncTime",
      DROP COLUMN IF EXISTS "syncPlatform",
      DROP COLUMN IF EXISTS "marketValue",
      DROP COLUMN IF EXISTS "currentValue",
      DROP COLUMN IF EXISTS "fundCode"
    `);

    // 删除用户表的新增字段
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "alertthreshold",
      DROP COLUMN IF EXISTS "monthlyreportenabled",
      DROP COLUMN IF EXISTS "interventionenabled",
      DROP COLUMN IF EXISTS "notificationpreferences",
      DROP COLUMN IF EXISTS "synctokenexpiry",
      DROP COLUMN IF EXISTS "synctoken",
      DROP COLUMN IF EXISTS "lastsynctime",
      DROP COLUMN IF EXISTS "syncplatform"
    `);

    // 删除操作记录表
    await queryRunner.query(`DROP TABLE IF EXISTS "action_records"`);
    
    // 删除行为日志表
    await queryRunner.query(`DROP TABLE IF EXISTS "behavior_logs"`);
  }
}