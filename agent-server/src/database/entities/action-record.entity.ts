import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('action_records')
@Index(['userId', 'createTime'])
@Index(['actionType', 'createTime'])
export class ActionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  actionType: 'add' | 'remove' | 'adjust' | 'rebalance' | 'sell_all' | 'buy_all';

  @Column({ type: 'varchar', length: 100, nullable: true })
  fundCode?: string;

  @Column({ type: 'varchar', length: 100 })
  fundName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  units?: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  price?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousAmount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  previousUnits?: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createTime: Date;

  @UpdateDateColumn()
  updateTime: Date;
}