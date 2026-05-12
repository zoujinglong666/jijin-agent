import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('risk_snapshots')
@Index('IDX_risk_snapshots_userId_createdAt', ['userId', 'createdAt'])
export class RiskSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index('IDX_risk_snapshots_userId')
  userId: string;

  @Column()
  score: number;

  @Column({ length: 20 })
  level: string;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  sectorConcentration: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  marketVolatility: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  behaviorScore: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  eventImpact: number;

  @CreateDateColumn()
  createdAt: Date;
}
