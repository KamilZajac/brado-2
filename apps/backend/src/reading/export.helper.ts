import * as ExcelJS from 'exceljs';
import { HourlyReading, LiveReading, LiveUpdate } from '@brado/types';
import { DateTime } from 'luxon';
import { SettingsEntity } from '../settings/entities/setting.entity';
import { ReadingsHelpers } from './readings-helpers';

function formatTimestampToPolish(msTimestamp: number): string {
  return DateTime.fromMillis(msTimestamp, { zone: 'Europe/Warsaw' }).toFormat(
    'dd.MM.yyyy HH:mm',
  );
}

export async function exportToExcelRAW(
  readings: HourlyReading[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Odczyty');
  worksheet.columns = [
    { header: 'Czas', key: 'timestamp', width: 30 },
    { header: 'Wartość', key: 'value', width: 30 },
  ];

  readings.forEach((r: HourlyReading) => {
    worksheet.addRow({
      timestamp: formatTimestampToPolish(+r.timestamp),
      value: r.value,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer(); // Write to memory buffer
  return Buffer.from(buffer);
}

export async function exportToExcel(
  readings: HourlyReading[],
  settings: SettingsEntity,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const uniqueSensorIds = Array.from(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    new Set(readings.map((entity) => entity.sensorId)),
  );

  const grouped: { [key: string]: HourlyReading[] } = {};

  uniqueSensorIds.forEach((key: number) => {
    grouped[key] = addGrowingAverage(
      readings.filter((r) => r.sensorId === +key),
      settings.hourlyTarget,
    );
  });

  addHourlyWorkSheets(grouped, workbook, settings);

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

  addHourlyWorkSheets(aggregated, workbook, settings);

  const buffer = await workbook.xlsx.writeBuffer(); // Write to memory buffer
  return Buffer.from(buffer);
}

export const addHourlyWorkSheets = (
  aggregated: {
    [key: string]: HourlyReading[];
  },
  workbook: ExcelJS.Workbook,
  settings: SettingsEntity,
) => {
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
};

export const addGrowingAverage = (
  readings: HourlyReading[],
  hourlyTarget: number,
): HourlyReading[] => {
  // const firstReadingWithValue = readings.find((r) => r.delta >= 5);
  const getPolandDay = (ts: number) =>
    DateTime.fromMillis(ts, { zone: 'Europe/Warsaw' }).day;

  let currentDay = -1;
  let firstReadingWithValue: HourlyReading | undefined;
  let firstReadingTodayIndex: number = -1;

  readings = readings.map((r, idx) => {
    if (getPolandDay(+r.timestamp) !== currentDay) {
      currentDay = getPolandDay(+r.timestamp);
      firstReadingTodayIndex = readings.findIndex(
        (reading) => getPolandDay(+reading.timestamp) === currentDay,
      );

      firstReadingWithValue = readings.find(
        (r) => r.delta > 5 && getPolandDay(+r.timestamp) === currentDay,
      );
    }

    if (!firstReadingWithValue) {
      return r;
    }

    const minutesSinceFirstReading = Math.floor(
      (+r.timestamp - +firstReadingWithValue.timestamp) / 60000,
    );

    const estimatedProduction =
      (minutesSinceFirstReading + 60) * (hourlyTarget / 60);

    const totalDelta = readings
      .slice(firstReadingTodayIndex, idx + 1)
      .reduce((sum, item) => sum + item.delta, 0);

    return {
      ...r,
      dailyTotal: totalDelta,
      growingAverage: {
        realProduction: r.delta > 5 ? totalDelta : 0,
        estimatedProduction: r.delta > 5 ? estimatedProduction : 0,
        endTime: r.timestamp,
        fromTime: firstReadingWithValue.timestamp,
        sensorId: r.sensorId,
      },
    };
  });

  return readings;
};
