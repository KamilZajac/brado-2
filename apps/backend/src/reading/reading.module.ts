import { Module } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { ReadingController } from './reading.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {ReadingsGateway} from "./readings.gateway";
import {LiveReadingEntity} from "./entities/minute-reading.entity";
import {HourlyReadingEntity} from "./entities/hourly-reading-entity";

@Module({
  imports: [TypeOrmModule.forFeature([LiveReadingEntity, HourlyReadingEntity])],
  controllers: [ReadingController],
  providers: [ReadingService, ReadingsGateway],
})
export class ReadingModule {}
