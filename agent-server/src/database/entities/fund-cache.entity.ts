import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('fund_cache')
@Index(['code'], { unique: true })
export class FundCacheEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 6 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, nullable: true })
  type: string;

  @Column({ length: 20, nullable: true })
  sector: string;

  @Column('float', { nullable: true })
  latestNav: number;

  @Column('float', { nullable: true })
  accNav: number;

  @Column('float', { nullable: true })
  dayChange: number;

  @Column('float', { nullable: true })
  weekChange: number;

  @Column('float', { nullable: true })
  monthChange: number;

  @Column('float', { nullable: true })
  threeMonthChange: number;

  @Column('float', { nullable: true })
  yearChange: number;

  @Column({ type: 'date', nullable: true })
  navDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
