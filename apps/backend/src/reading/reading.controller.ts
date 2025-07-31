import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ReadingService } from './reading.service';
import { LiveReading } from '@brado/types';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('reading')
// @UseGuards(AuthGuard('jwt'))
export class ReadingController {
  constructor(private readonly readingsService: ReadingService) {}

  @Get()
  getAll() {
    return this.readingsService.getAll();
  }

  @Get('live-init/:timestamp')
  liveInit(@Param('timestamp') startOfTheDateTS: string) {
    return this.readingsService.getInitialLiveData(startOfTheDateTS);
  }

  @Post('update-live-reading')
  updateLiveReading(@Body() liveReading: LiveReading) {
    return this.readingsService.createOrUpdateLiveReading(liveReading);
  }

  @Get('after/:timestamp')
  getAfter(@Param('timestamp') ts: string) {
    return this.readingsService.getAfterTime(ts);
  }

  @Get('hourly/:fromTS/:toTS')
  getHourly(@Param('fromTS') fromTS: string, @Param('toTS') toTS: string) {
    return this.readingsService.getHourly(fromTS, toTS);
  }

  @Get('monthly-summary/:fromTS/:toTS')
  getHourlySummary(
    @Param('fromTS') fromTS: string,
    @Param('toTS') toTS: string,
  ) {
    return this.readingsService.getMonthlyStats(fromTS, toTS);
  }

  @Get('aggregate')
  aggregate(): Promise<string> {
    return this.readingsService.aggregate();
  }

  @Post('delete')
  delete(@Body() readingIds: string[]): Promise<string> {
    return this.readingsService.delete(readingIds);
  }

  @Post('import-csv/:sensorID')
  @UseInterceptors(FileInterceptor('file')) // Wymaga multer do obsługi plików
  async importCsv(
    @Param('sensorID') sensorID: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    const csvData = file.buffer.toString(); // Odczytaj dane CSV z bufora
    return await this.readingsService.importCsvData(sensorID, csvData); // Przekaż dane do ReadingService
  }

  @Get('export-live/:sensorId')
  async exportLive(@Param('sensorId') sensorId: string, @Res() res: Response) {
    const buffer = await this.readingsService.exportLiveData(sensorId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    res.send(buffer);
  }

  // export-hourly/${fromTS}/${toTS}/${sensorIdd}
  @Get('export-hourly/:fromTS/:toTS/:sensorId')
  async export(
    @Param('fromTS') fromTS: string,
    @Param('toTS') toTS: string,
    @Param('sensorId') sensorId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.readingsService.exportData(
      fromTS,
      toTS,
      +sensorId,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    res.send(buffer);
  }

  @Get('export-raw/:fromTS/:toTS/:sensorID')
  async exportRaw(
    @Param('fromTS') fromTS: string,
    @Param('toTS') toTS: string,
    @Param('sensorID') sensorID: string,
    @Res() res: Response,
  ) {
    const buffer = await this.readingsService.exportRawData(
      fromTS,
      toTS,
      sensorID,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
    res.send(buffer);
  }

  // @Get('export-live/:fromTS')
  // async exportLive(@Param('fromTS') fromTS: string, @Res() res: Response) {
  //   const buffer = await this.readingsService.exportLiveData(fromTS);
  //
  //   res.setHeader(
  //     'Content-Type',
  //     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //   );
  //   res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  //   res.send(buffer);
  // }
}

@Controller('connector-reading')
export class ConnectorReadingController {
  constructor(private readonly readingsService: ReadingService) {}

  @Post()
  add(@Body() readings: { data: [LiveReading] }) {
    return this.readingsService.addReading(readings.data);
  }

  // test only
  @Get('latest')
  getLatest(): Promise<{ 1: number; 2: number }> {
    return this.readingsService.getLatest();
  }
}
