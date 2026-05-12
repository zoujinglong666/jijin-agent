import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('emotion_history')
@Index('IDX_emotion_history_userId_createdAt', ['userId', 'createdAt'])
export class EmotionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index('IDX_emotion_history_userId')
  userId: string;

  @Column()
  score: number;

  @Column({ length: 20 })
  level: string;

  @Column({ length: 20 })
  trend: string;

  @CreateDateColumn()
  createdAt: Date;
}
