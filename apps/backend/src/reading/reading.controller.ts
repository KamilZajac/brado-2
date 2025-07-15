import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ReadingService } from './reading.service';
import { LiveReading } from '@brado/types';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller('reading')
@UseGuards(AuthGuard('jwt'))
export class ReadingController {
  constructor(private readonly readingsService: ReadingService) {}

  @Get()
  getAll() {
    return this.readingsService.getAll();
  }

  @Get('live-init/:timestamp')
  liveInit(@Param('timestamp') startOfTheDateTS: string) {
    return this.readingsService.getInitialLiveData(startOfTheDateTS);
  }

  @Post('update-live-reading')
  updateLiveReading(@Body() liveReading: LiveReading) {
    return this.readingsService.createOrUpdateLiveReading(liveReading);
  }

  @Get('after/:timestamp')
  getAfter(@Param('timestamp') ts: string) {
    return this.readingsService.getAfterTime(ts);
  }

  @Get('hourly/:fromTS/:toTS')
  getHourly(@Param('fromTS') fromTS: string, @Param('toTS') toTS: string) {
    return this.readingsService.getHourly(fromTS, toTS);
  }

  @Get('monthly-summary/:fromTS/:toTS')
  getHourlySummary(@Param('fromTS') fromTS: string, @Param('toTS') toTS: string) {
    return this.readingsService.getMonthlyStats(fromTS, toTS);
  }

  @Get('aggregate')
  aggregate(): Promise<string> {
    return this.readingsService.aggregate();
  }

  @Get('export/:fromTS/:toTS')
  async export(
    @Param('fromTS') fromTS: string,
    @Param('toTS') toTS: string,
    @Res() res: Response,
  ) {
    const buffer = await this.readingsService.exportData(fromTS, toTS);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    res.send(buffer);
  }

  @Get('export-live/:fromTS')
  async exportLive(@Param('fromTS') fromTS: string, @Res() res: Response) {
    const buffer = await this.readingsService.exportLiveData(fromTS);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    res.send(buffer);
  }
}

@Controller('connector-reading')
export class ConnectorReadingController {
  constructor(private readonly readingsService: ReadingService) {}

  @Post()
  add(@Body() readings: { data: [LiveReading] }) {
    console.log(readings);
    return this.readingsService.addReading(readings.data);
  }

  // test only
  @Get('latest')
  getLatest(): Promise<{ 1: number; 2: number }> {
    return this.readingsService.getLatest();
  }
}
