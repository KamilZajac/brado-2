import { Module } from '@nestjs/common';
import { TemperatureService } from './temperature.service';
import {
  ConnectorTemperatureController,
  TemperatureController,
} from './temperature.controller';
import { TemperatureEntity } from './entities/temperature.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([TemperatureEntity])],
  controllers: [TemperatureController, ConnectorTemperatureController],
  providers: [TemperatureService],
})
export class TemperatureModule {}
