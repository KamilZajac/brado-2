import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Res,
} from '@nestjs/common';
import { TemperatureService } from './temperature.service';
import { CreateTemperatureDto } from './dto/create-temperature.dto';
import { UpdateTemperatureDto } from './dto/update-temperature.dto';
import { ReadingService } from '../reading/reading.service';
import { LiveReading, TempReading } from '@brado/types';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

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

  @Get('export/:tempID')
  async export(@Param('tempID') tempID: string, @Res() res: Response) {
    const buffer = await this.tempService.exportTemp(tempID);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="temperature_${tempID}.xlsx"`);
    res.send(buffer);
  }

  @Get('export-all')
  async exportAll(@Res() res: Response) {
    const buffer = await this.tempService.exportAllTemps();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="all_temperatures.xlsx"');
    res.send(buffer);
  }
}

@Controller('connector-temp')
export class ConnectorTemperatureController {
  constructor(private readonly tempService: TemperatureService) {}

  @Post()
  add(@Body() readings: { data: [TempReading] }) {
    return this.tempService.addReading(readings.data);
  }

  @Get('test')
  test() {
    return this.tempService.testEmail();
  }
}
