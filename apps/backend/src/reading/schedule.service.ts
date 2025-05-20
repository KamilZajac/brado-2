import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {ReadingService} from "./reading.service";

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readingService: ReadingService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  handleCron() {
    this.readingService
      .aggregate()
      .then((res) => {
        this.logger.log(res);
      })
      .catch((err) => {
        this.logger.error(err);
      });
    // Call your periodic function here
  }
}
