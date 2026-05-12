import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('agent_outputs')
@Index('IDX_agent_outputs_userId_createdAt', ['userId', 'createdAt'])
export class AgentOutputRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index('IDX_agent_outputs_userId')
  userId: string;

  @Column({ type: 'text' })
  insight: string;

  @Column({ type: 'text' })
  riskExplanation: string;

  @Column({ type: 'text' })
  behaviorInsight: string;

  @Column({ type: 'text' })
  emotionInsight: string;

  @Column({ default: false })
  shouldNotify: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  importance: number;

  @CreateDateColumn()
  createdAt: Date;
}
