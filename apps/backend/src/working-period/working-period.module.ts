import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WorkingPeriodService } from './working-period.service';
import { WorkingPeriodController } from './working-period.controller';
import { WorkingPeriodEntity } from './entities/working-period.entity';
import { LiveReadingEntity } from '../reading/entities/minute-reading.entity';
import { HourlyReadingEntity } from '../reading/entities/hourly-reading-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkingPeriodEntity,
      LiveReadingEntity,
      HourlyReadingEntity,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [WorkingPeriodController],
  providers: [WorkingPeriodService],
  exports: [WorkingPeriodService],
})
export class WorkingPeriodModule {}
