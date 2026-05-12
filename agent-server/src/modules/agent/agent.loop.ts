import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AGENT_LOOP_INTERVAL } from '../../common/constants';

@Injectable()
export class AgentLoop implements OnModuleInit {
  private readonly logger = new Logger(AgentLoop.name);
  private intervalId: NodeJS.Timeout | null = null;

  constructor(private agentService: AgentService) {}

  onModuleInit() {
    this.start();
  }

  start() {
    this.logger.log(`Agent loop started with interval: ${AGENT_LOOP_INTERVAL / 1000}s`);
    this.intervalId = setInterval(async () => {
      try {
        await this.agentService.runForAllUsers();
      } catch (error) {
        this.logger.error(`Agent loop error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      }
    }, AGENT_LOOP_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
