import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TemperatureService } from './temperature.service';
import {MailService} from "../mail/mail.service";

@Injectable()
export class ScheduleService implements OnModuleInit {
  onModuleInit() {
    console.log('Temperature Cron service initialized');
  }

  private readonly logger = new Logger(ScheduleService.name);

  constructor(private tempService: TemperatureService) {}

  @Cron('0 21 * * *', {
    timeZone: 'Europe/Warsaw', // or your desired TZ
  })
  handleCronAggregate() {
    this.tempService
      .deleteOldReadings()
      .then((res) => {
        this.logger.log(res);
      })
      .catch((err) => {
        this.logger.error(err);
      });
    // Call your periodic function here
  }

  @Cron('0 14 * * 5', {
    timeZone: 'Europe/Warsaw',
  })
  handlePeriodicTempSend() {
    this.tempService
      .exportAllTempsAndSend()
      .then((res) => {
        this.logger.log(res);
      })
      .catch((err) => {
        this.logger.error(err);
      });
    // Call your periodic function here
  }
}
