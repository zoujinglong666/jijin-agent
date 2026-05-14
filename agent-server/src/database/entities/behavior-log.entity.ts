import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('behavior_logs')
@Index(['userId', 'createdAt'])
@Index(['eventType', 'createdAt'])
export class BehaviorLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  eventType: 'REFRESH' | 'PORTFOLIO_VIEW' | 'FUND_VIEW' | 'ADD_POSITION' | 'REMOVE_POSITION' | 'SIMULATE_SELL' | 'SIMULATE_BUY' | 'MARKET_CHECK' | 'ALERT_VIEW';

  @Column({ type: 'varchar', length: 100, nullable: true })
  fundCode?: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  eventData?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount?: number;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}