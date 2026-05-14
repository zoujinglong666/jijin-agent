import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('funds')
@Index('IDX_funds_userId_sector', ['userId', 'sector'])
export class Fund {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index('IDX_funds_userId')
  userId: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  code: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, default: 0 })
  profitRate: number;

  @Column({ length: 20 })
  sector: string;

  @Column({ length: 50, nullable: true })
  accountId: string;

  // 新增字段：支持同步功能
  @Column({ length: 20, nullable: true })
  fundCode: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  currentValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  marketValue: number;

  @Column({ length: 20, nullable: true })
  syncPlatform: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncTime: Date;

  // 新增字段：支持行为分析和提醒
  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  targetAllocation: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  actualAllocation: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  deviation: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  costBasis: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  volatility: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}