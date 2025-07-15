import {
  Controller,
  Get,
  Param,
  Post,
  ParseIntPipe,
} from '@nestjs/common';
import { WorkingPeriodService } from './working-period.service';
import { WorkingPeriodEntity } from './entities/working-period.entity';

@Controller('working-period')
export class WorkingPeriodController {
  constructor(private readonly workingPeriodService: WorkingPeriodService) {}

  @Get()
  async getAll(): Promise<WorkingPeriodEntity[]> {
    return this.workingPeriodService.getAll();
  }

  @Get(':sensorId')
  async getBySensorId(
    @Param('sensorId', ParseIntPipe) sensorId: number,
  ): Promise<WorkingPeriodEntity[]> {
    return this.workingPeriodService.getBySensorId(sensorId);
  }

  @Post('detect')
  async manualDetection(): Promise<void> {
    return this.workingPeriodService.manualDetection();
  }
}
