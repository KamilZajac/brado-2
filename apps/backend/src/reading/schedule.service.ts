import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReadingService } from './reading.service';

@Injectable()
export class ScheduleService implements OnModuleInit {
  onModuleInit() {
    console.log('Cron service initialized');
  }

  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readingService: ReadingService) {}

  @Cron('0 15 * * *', {
    timeZone: 'Europe/Warsaw', // or your desired TZ
  })
  handleCronAggregate() {
    this.readingService
      .aggregate()
      .then((res) => {
      })
      .catch((err) => {
        this.logger.error(err);
      });
    // Call your periodic function here
  }

  @Cron('0 20 * * *', {
    timeZone: 'Europe/Warsaw', // or your desired TZ
  })
  handleCronDeleteOldData() {
    this.readingService
      .deleteOldReadings()
      .then((res) => {
      })
      .catch((err) => {
        this.logger.error(err);
      });
    // Call your periodic function here
  }
}
