import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TemperatureService } from './temperature.service';
import { CreateTemperatureDto } from './dto/create-temperature.dto';
import { UpdateTemperatureDto } from './dto/update-temperature.dto';
import { ReadingService } from '../reading/reading.service';
import { LiveReading, TempReading } from '@brado/types';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('temperature')
export class TemperatureController {
  constructor(private readonly tempService: TemperatureService) {}

  @Get()
  getAll() {
    return this.tempService.getAll();
  }

  @Get('latest')
  getLatest() {
    return this.tempService.getLatest();
  }
}

@Controller('connector-temp')
export class ConnectorTemperatureController {
  constructor(private readonly tempService: TemperatureService) {}

  @Post()
  add(@Body() readings: { data: [TempReading] }) {
    return this.tempService.addReading(readings.data);
  }
}
