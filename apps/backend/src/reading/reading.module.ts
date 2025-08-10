import { forwardRef, Module } from '@nestjs/common';
import { ReadingService } from './reading.service';
import {
  ConnectorReadingController,
  ReadingController,
} from './reading.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReadingsGateway } from './readings.gateway';
import { LiveReadingEntity } from './entities/minute-reading.entity';
import { HourlyReadingEntity } from './entities/hourly-reading-entity';
import { ScheduleService } from './schedule.service';
import { SettingsModule } from '../settings/settings.module';
import { AnnotationEntity } from '../annotation/entities/annotation.entity';
import { WorkingPeriodModule } from '../working-period/working-period.module';
import { AnnotationModule } from '../annotation/annotation.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiveReadingEntity,
      HourlyReadingEntity,
      AnnotationEntity,
    ]),
    forwardRef(() => SettingsModule),
    forwardRef(() => WorkingPeriodModule),
    forwardRef(() => AnnotationModule),
    NotificationsModule,
  ],
  controllers: [ReadingController, ConnectorReadingController],
  providers: [ReadingService, ReadingsGateway, ScheduleService],
  exports: [ReadingService],
})
export class ReadingModule {}
