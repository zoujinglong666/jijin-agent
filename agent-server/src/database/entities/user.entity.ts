import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ name: 'riskpreference', length: 50, default: 'balanced' })
  riskPreference: string;

  @Column({ name: 'isactive', default: true })
  isActive: boolean;

  @Column({ name: 'behaviortrackingenabled', default: true })
  behaviorTrackingEnabled: boolean;

  @Column({ name: 'dailyreportenabled', default: true })
  dailyReportEnabled: boolean;

  @Column({ name: 'llmmodel', length: 50, default: 'deepseek-v4-pro' })
  llmModel: string;

  @Column({ name: 'llmapikey', length: 500, default: '' })
  llmApiKey: string;

  @CreateDateColumn({ name: 'createdat' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedat' })
  updatedAt: Date;
}