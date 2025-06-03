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

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveReadingEntity, HourlyReadingEntity]),
    SettingsModule,
  ],
  controllers: [ReadingController, ConnectorReadingController],
  providers: [ReadingService, ReadingsGateway, ScheduleService],
})
export class ReadingModule {}
