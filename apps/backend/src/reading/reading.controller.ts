import {Controller, Get, Post, Body, Param} from '@nestjs/common';
import { ReadingService } from './reading.service';
import {DataReading} from "@brado/shared-models";


@Controller('reading')
export class ReadingController {
  constructor(private readonly readingsService: ReadingService) {}

  @Post()
  add(@Body() readings: { data: [DataReading]}) {
    console.log(readings.data)
    return this.readingsService.addReading(readings.data);
  }

  @Get()
  getAll() {
    return this.readingsService.getAll();
  }

  @Get('after/:timestamp')
  getAfter(@Param('timestamp') ts: string) {
    return this.readingsService.getAfterTime(ts)
  }
}
