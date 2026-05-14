import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Fund } from './entities/fund.entity';
import { ActionRecord } from './entities/action-record.entity';
import { BehaviorLog } from './entities/behavior-log.entity';
import { RiskSnapshot } from './entities/risk-snapshot.entity';
import { EmotionHistory } from './entities/emotion-history.entity';
import { NewsEvent } from './entities/news-event.entity';
import { AgentOutputRecord } from './entities/agent-output.entity';
import { GrowthMetricsEntity } from './entities/growth-metrics.entity';
import { NotificationEntity } from './entities/notification.entity';
import { FundCacheEntity } from './entities/fund-cache.entity';

const entities = [User, Fund, ActionRecord, BehaviorLog, RiskSnapshot, EmotionHistory, NewsEvent, AgentOutputRecord, GrowthMetricsEntity, NotificationEntity, FundCacheEntity];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbType = configService.get('DB_TYPE', 'postgres');

        if (dbType === 'sqlite') {
          return {
            type: 'better-sqlite3',
            database: configService.get('DB_DATABASE', 'data/fundguardian.db'),
            entities,
            synchronize: true,
            logging: configService.get('DB_LOGGING', 'false') === 'true',
          };
        }

        return {
          type: 'postgres',
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get('DB_USERNAME', 'fundguardian'),
          password: configService.get('DB_PASSWORD', 'fundguardian'),
          database: configService.get('DB_DATABASE', 'fundguardian'),
          entities,
          synchronize: configService.get('DB_SYNC', 'true') === 'true',
          logging: configService.get('DB_LOGGING', 'false') === 'true',
          ssl: configService.get('DB_SSL', 'false') === 'true' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    TypeOrmModule.forFeature(entities),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
