import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('notifications')
@Index(['userId', 'read'])
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 36 })
  @Index()
  userId: string;

  @Column({ length: 20 })
  type: string;

  @Column({ length: 200 })
  title: string;

  @Column({ length: 1000 })
  content: string;

  @Column({ length: 50, nullable: true })
  level: string;

  @Column({ length: 50, nullable: true })
  sector: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
