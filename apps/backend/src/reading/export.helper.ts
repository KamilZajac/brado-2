// export.service.ts (or any service)
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { HourlyReading, LiveReading, LiveUpdate } from '@brado/types';
import { DateTime } from 'luxon';
import { SettingsEntity } from '../settings/entities/setting.entity';
import { ReadingsHelpers } from './readings-helpers';

function formatTimestampToPolish(msTimestamp: number): string {
  return DateTime.fromMillis(msTimestamp, { zone: 'Europe/Warsaw' }).toFormat(
    'dd.MM.yyyy HH:mm',
  );
}

export async function exportToExcel(
  readings: HourlyReading[] | LiveReading[],
  settings: SettingsEntity,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const uniqueSensorIds = Array.from(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    new Set(readings.map((entity) => entity.sensorId)),
  );

  uniqueSensorIds.forEach((sensorId: number) => {
    const worksheet = workbook.addWorksheet(sensorId.toString());

    // Define columns
    worksheet.columns = [
      { header: 'Czas', key: 'timestamp', width: 30 },
      { header: 'Wartość', key: 'value', width: 30 },
      { header: 'Suma', key: 'dailyTotal', width: 30 },
    ];

    readings
      .filter((r) => r.sensorId === sensorId)
      .map((r) => ({
        ...r,
        timestamp: formatTimestampToPolish(+r.timestamp),
      }))
      .forEach((row) => worksheet.addRow(row));

    // Optional: Style header
    worksheet.getRow(1).font = { bold: true };
  });

  // Write to file
  // const outputPath = path.join(__dirname, 'output.xlsx');
  // await workbook.xlsx.writeFile(outputPath);
  // console.log(`Excel file saved to ${outputPath}`);

  const buffer = await workbook.xlsx.writeBuffer(); // Write to memory buffer
  return Buffer.from(buffer);
}

export async function exportToExcelLive(
  readings: LiveUpdate,
  settings: SettingsEntity,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  Object.keys(readings).forEach((sensorId: string) => {
    const worksheet = workbook.addWorksheet(
      settings.sensorNames[+sensorId - 1] + '- minutowe',
    );

    // Define columns
    worksheet.columns = [
      { header: 'Czas', key: 'timestamp', width: 30 },
      { header: 'Wartość', key: 'value', width: 30 },
      { header: 'Delta', key: 'delta', width: 30 },
      { header: 'Suma', key: 'dailyTotal', width: 30 },
    ];

    readings[sensorId].readings
      .map((r: LiveReading) => ({
        ...r,
        timestamp: formatTimestampToPolish(+r.timestamp),
      }))
      .forEach((row) => worksheet.addRow(row));

    worksheet.getRow(1).font = { bold: true };
  });

  const aggregated = {};

  Object.keys(readings).forEach((sensorId: string) => {
    aggregated[sensorId] = addGrowingAverage(
      ReadingsHelpers.aggregateToHourlyReadings(readings[sensorId].readings),
      settings.hourlyTarget,
    );
  });

  console.log(aggregated[1][6]);

  Object.keys(aggregated).forEach((sensorId: string) => {
    const worksheet = workbook.addWorksheet(
      settings.sensorNames[+sensorId - 1] + '- godzinowe',
    );

    // Define columns
    worksheet.columns = [
      { header: 'Czas', key: 'timestamp', width: 30 },
      { header: 'Wartość', key: 'value', width: 30 },
      { header: 'Delta', key: 'delta', width: 30 },
      { header: 'Średnio/min', key: 'average', width: 30 },
      { header: 'Suma', key: 'dailyTotal', width: 30 },
      { header: 'Estymacja', key: 'growingAverageEst', width: 30 },
      { header: 'Średnia rosnąca', key: 'growingAveragePerc', width: 30 },
    ];

    aggregated[sensorId]
      .map((r: LiveReading) => {

        const estimated = r.growingAverage?.estimatedProduction ?? 0;
        const estToPrint = estimated > 0 ? estimated : 0;

        const real = r.growingAverage?.realProduction ?? 0;

        const growingPerc = estToPrint > 0 ? real / estToPrint : 0;



        return {
          ...r,
          growingAverageEst: estToPrint,
          growingAveragePerc: growingPerc,
          timestamp: formatTimestampToPolish(+r.timestamp),
        };
      })
      .forEach((row) => worksheet.addRow(row));

    worksheet.getRow(1).font = { bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer(); // Write to memory buffer
  return Buffer.from(buffer);
}

export const addGrowingAverage = (
  readings: HourlyReading[],
  hourlyTarget: number,
): HourlyReading[] => {
  const firstReadingWithValue = readings.find((r) => r.delta >= 5);

  if (!firstReadingWithValue) {
    console.error('no first reading, or hourly target');
    return readings;
  }

  readings = readings.map((r, idx) => {
    const minutesSinceFirstReading = Math.floor(
      (+r.timestamp - +firstReadingWithValue.timestamp) / 60000,
    );

    const estimatedProduction =
      (minutesSinceFirstReading + 60) * (hourlyTarget / 60);

    const totalDelta = readings
      .slice(0, idx + 1)
      .reduce((sum, item) => sum + item.delta, 0);

    const realProduction = totalDelta;

    return {
      ...r,
      dailyTotal: totalDelta,
      growingAverage: {
        realProduction,
        estimatedProduction,
        endTime: r.timestamp,
        fromTime: firstReadingWithValue.timestamp,
        sensorId: r.sensorId,
      },
    };
  });

  console.log(readings);
  return readings;
};
