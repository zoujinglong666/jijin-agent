import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('growth_metrics')
@Index('IDX_growth_metrics_userId', ['userId'])
export class GrowthMetricsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 36 })
  @Index('IDX_growth_metrics_userId_col')
  userId: string;

  @Column({ default: 0 })
  stableDays: number;

  @Column('float', { default: 0 })
  riskControlRate: number;

  @Column('float', { default: 0 })
  emotionStability: number;

  @Column('float', { default: 0 })
  longTermHoldIndex: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
