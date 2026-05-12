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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
