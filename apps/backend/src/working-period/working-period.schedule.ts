import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WorkingPeriodService } from './working-period.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class WorkingPeriodSchedule implements OnModuleInit {
  onModuleInit() {
    console.log('WorkingPeriodSchedule Cron service initialized');
  }

  private readonly logger = new Logger('WorkingPeriods');

  constructor(private workingPeriodService: WorkingPeriodService) {}

  @Cron('*/15 * * * *', {
    timeZone: 'Europe/Warsaw', // or your desired TZ
  })
  async detectWorkingPeriods(): Promise<void> {
    await this.workingPeriodService.detectWorkingPeriods();
  }
}
