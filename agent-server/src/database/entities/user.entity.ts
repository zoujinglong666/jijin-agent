import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ name: 'riskpreference', length: 50, default: 'balanced' })
  riskPreference: string;

  @Column({ name: 'isactive', default: true })
  isActive: boolean;

  @Column({ name: 'behaviortrackingenabled', default: true })
  behaviorTrackingEnabled: boolean;

  @Column({ name: 'dailyreportenabled', default: true })
  dailyReportEnabled: boolean;

  @Column({ name: 'llmmodel', length: 50, default: 'deepseek-v4-pro' })
  llmModel: string;

  @Column({ name: 'llmapikey', length: 500, default: '' })
  llmApiKey: string;

  // 新增字段：支持数据同步
  @Column({ name: 'syncplatform', length: 20, nullable: true })
  syncPlatform: string;

  @Column({ name: 'lastsynctime', type: 'timestamp', nullable: true })
  lastSyncTime: Date;

  @Column({ name: 'synctoken', length: 500, nullable: true })
  syncToken: string;

  @Column({ name: 'synctokenexpiry', type: 'timestamp', nullable: true })
  syncTokenExpiry: Date;

  // 新增字段：支持行为分析和提醒
  @Column({ name: 'notificationpreferences', type: 'json', nullable: true })
  notificationPreferences: Record<string, any>;

  @Column({ name: 'interventionenabled', default: true })
  interventionEnabled: boolean;

  @Column({ name: 'monthlyreportenabled', default: true })
  monthlyReportEnabled: boolean;

  @Column({ name: 'alertthreshold', type: 'decimal', precision: 8, scale: 4, default: 0.05 })
  alertThreshold: number;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}