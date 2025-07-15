import { Module } from '@nestjs/common';
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
import { AnnotationService } from '../annotation/annotation.service';
import { AnnotationEntity } from '../annotation/entities/annotation.entity';
import { WorkingPeriodEntity } from '../working-period/entities/working-period.entity';
import { WorkingPeriodModule } from '../working-period/working-period.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LiveReadingEntity,
      HourlyReadingEntity,
      AnnotationEntity,
      WorkingPeriodEntity,
    ]),
    SettingsModule,
    WorkingPeriodModule,
  ],
  controllers: [ReadingController, ConnectorReadingController],
  providers: [
    ReadingService,
    ReadingsGateway,
    ScheduleService,
    AnnotationService,
  ],
})
export class ReadingModule {}
