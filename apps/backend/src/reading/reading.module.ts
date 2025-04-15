import { Module } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { ReadingController } from './reading.controller';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Reading} from "./entities/reading.entity";
import {ReadingsGateway} from "./readings.gateway";

@Module({
  imports: [TypeOrmModule.forFeature([Reading])],
  controllers: [ReadingController],
  providers: [ReadingService, ReadingsGateway],
})
export class ReadingModule {}
