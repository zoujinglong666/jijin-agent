import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('action_records')
@Index('IDX_action_records_userId_createTime', ['userId', 'createTime'])
export class ActionRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index('IDX_action_records_userId')
  userId: string;

  @Column({ length: 50 })
  fundId: string;

  @Column({ length: 20 })
  actionType: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  ratio: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createTime: Date;
}
