import {Controller, Get, Post, Body, Param} from '@nestjs/common';
import {ReadingService} from './reading.service';
import {LiveReading} from "@brado/types";


@Controller('reading')
export class ReadingController {
    constructor(private readonly readingsService: ReadingService) {
    }

    @Post()
    add(@Body() readings: { data: [LiveReading] }) {
        return this.readingsService.addReading(readings.data);
    }

    @Get()
    getAll() {
        return this.readingsService.getAll();
    }

    @Get('live-init/:timestamp')
    liveInit(@Param('timestamp') startOfTheDateTS: string) {
        return this.readingsService.getInitialLiveData(startOfTheDateTS)
    }

    @Get('after/:timestamp')
    getAfter(@Param('timestamp') ts: string) {
        return this.readingsService.getAfterTime(ts)
    }

    @Get('hourly/:fromTS/:toTS')
    getHourly(@Param('fromTS') fromTS: string, @Param('toTS') toTS: string) {
        return this.readingsService.getHourly(fromTS, toTS)
    }

    // test only
    @Get('latest')
    getLatest(): Promise<{ 1: number, 2: number }> {
        return this.readingsService.getLatest()
    }

    @Get('aggregate')
    aggregate(): Promise<string> {
        return this.readingsService.aggregate()
    }
}
