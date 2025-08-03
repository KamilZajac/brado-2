import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { WorkingPeriodService } from './working-period.service';
import { WorkingPeriodEntity } from './entities/working-period.entity';
import { WorkingPeriodType } from '@brado/types';

@Controller('working-period')
export class WorkingPeriodController {
  constructor(private readonly workingPeriodService: WorkingPeriodService) {}

  @Get(':fromTS/:toTS/:type')
  async getFromTo(
    @Param('fromTS') fromTS: string,
    @Param('toTS') toTS: string,
    @Param('type', new ParseEnumPipe(WorkingPeriodType, { optional: true })) type?: WorkingPeriodType,
  ): Promise<WorkingPeriodEntity[]> {
    return this.workingPeriodService.getBetween(fromTS, toTS, type);
  }

  @Get(':sensorId')
  async getBySensorId(
    @Param('sensorId', ParseIntPipe) sensorId: number,
    @Query('type', new ParseEnumPipe(WorkingPeriodType, { optional: true }))
    type?: WorkingPeriodType,
  ): Promise<WorkingPeriodEntity[]> {
    return this.workingPeriodService.getBySensorId(sensorId, type);
  }

  @Post('detect')
  async manualDetection(): Promise<void> {
    return this.workingPeriodService.manualDetection();
  }

  @Post('detect/live')
  async manualLiveDetection(): Promise<void> {
    return this.workingPeriodService.manualLiveDetection();
  }

  @Post('detect/hourly')
  async manualHourlyDetection(): Promise<void> {
    return this.workingPeriodService.manualHourlyDetection();
  }
}
