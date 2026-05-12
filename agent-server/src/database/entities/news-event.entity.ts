import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('news_events')
@Index('IDX_news_events_relatedSectors', ['relatedSectors'])
export class NewsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ length: 100, nullable: true })
  source: string;

  @Column({ type: 'simple-array' })
  relatedSectors: string[];

  @Column({ length: 10, default: 'low' })
  impactLevel: string;

  @CreateDateColumn()
  createdAt: Date;
}
