import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkingPeriodService } from './working-period.service';
import { WorkingPeriodController } from './working-period.controller';
import { WorkingPeriodEntity } from './entities/working-period.entity';
import { WorkingPeriodSchedule } from './working-period.schedule';
import { ReadingModule } from '../reading/reading.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkingPeriodEntity]),
    forwardRef(() => ReadingModule),
  ],
  controllers: [WorkingPeriodController],
  providers: [WorkingPeriodService, WorkingPeriodSchedule],
  exports: [WorkingPeriodService],
})
export class WorkingPeriodModule {}
