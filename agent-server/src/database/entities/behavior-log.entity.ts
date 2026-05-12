import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('behavior_logs')
@Index('IDX_behavior_logs_userId_eventType', ['userId', 'eventType'])
export class BehaviorLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index('IDX_behavior_logs_userId')
  userId: string;

  @Column({ length: 30 })
  eventType: string;

  @Column({ type: 'text', nullable: true })
  payload: string;

  @CreateDateColumn()
  createdAt: Date;
}
