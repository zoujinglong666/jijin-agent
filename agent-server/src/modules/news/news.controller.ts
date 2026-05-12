import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { NewsService } from './news.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NewsEvent as NewsEventEntity } from '../../database/entities/news-event.entity';

@Controller('news')
@UseGuards(JwtAuthGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getEvents(@Req() req: any, @Query('sectors') sectors?: string, @Query('limit') limit?: string) {
    const sectorList = sectors ? sectors.split(',') : undefined;
    return this.newsService.getLatestEvents(sectorList, limit ? parseInt(limit) : 10);
  }

  @Post()
  async addEvent(@Req() req: any, @Body() body: Omit<NewsEventEntity, 'id' | 'createdAt'>) {
    return this.newsService.addEvent(body);
  }
}