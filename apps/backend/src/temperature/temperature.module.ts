import { Module } from '@nestjs/common';
import { TemperatureService } from './temperature.service';
import {
  ConnectorTemperatureController,
  TemperatureController,
} from './temperature.controller';
import { TemperatureEntity } from './entities/temperature.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleService } from './schedule.service';
import { ReadingsGateway } from '../reading/readings.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([TemperatureEntity])],
  controllers: [TemperatureController, ConnectorTemperatureController],
  providers: [TemperatureService, ScheduleService, ReadingsGateway],
})
export class TemperatureModule {}
