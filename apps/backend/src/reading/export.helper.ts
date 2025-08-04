import * as ExcelJS from 'exceljs';
import {
  addGrowingAverageHourly,
  Annotation,
  getAnnotationTitle,
  HourlyReading,
  LiveReading,
  WorkingPeriod,
} from '@brado/types';
import { DateTime } from 'luxon';
import { SettingsEntity } from '../settings/entities/setting.entity';
import { ReadingsHelpers } from './readings-helpers';
import { AnnotationEntity } from '../annotation/entities/annotation.entity';

function formatTimestampToPolish(msTimestamp: number): string {
  if (msTimestamp === 0) {
    return '0';
  }
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

// Todo - add multiperiod handle
export async function exportToExcel(
  readings: HourlyReading[],
  settings: SettingsEntity,
  annotations: AnnotationEntity[],
  workPeriods?: WorkingPeriod[],
): Promise<Buffer> {

  const workbook = new ExcelJS.Workbook();

  const groupedReadings: HourlyReading[][] = [];

  if (workPeriods?.length) {
    workPeriods.forEach((period) => {
      groupedReadings.push(
        readings.filter((r) => {
          if (period.end != null) {
            return (
              r.workStartTime >= period.start && r.workEndTime <= period.end
            );
          } else {
            return r.workStartTime >= period.start;
          }
        }),
      );
    });
  } else {
    groupedReadings.push(readings);
  }

  const sensorId = readings[0].sensorId;
  const worksheet = workbook.addWorksheet(
    settings.sensorNames[+sensorId - 1] + '- godzinowe',
  );

  const mappedReadings = addGrowingAverageHourly(
    groupedReadings,
    settings.hourlyTarget,
  );

  addHourlyWorkSheets(mappedReadings, worksheet);

  if (annotations.length) {
    addAnnotationsWorksheet(workbook, annotations, sensorId);
  }
  const buffer = await workbook.xlsx.writeBuffer(); // Write to memory buffer
  return Buffer.from(buffer);
}

export async function exportToExcelLive(
  readings: LiveReading[],
  settings: SettingsEntity,
  annotations: AnnotationEntity[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const sensorId = readings[0].sensorId;

  const worksheet = workbook.addWorksheet(
    settings.sensorNames[sensorId - 1] + '- minutowe',
  );

  // Define columns
  worksheet.columns = [
    { header: 'Czas', key: 'timestamp', width: 30 },
    { header: 'Stan licznika', key: 'value', width: 30 },
    { header: 'Delta', key: 'delta', width: 30 },
    { header: 'Suma', key: 'dailyTotal', width: 30 },
  ];

  let dailyTotal = 0;

  const readingsWithDailyTotal = readings.map((r: LiveReading) => {
    dailyTotal += r.delta;
    return {
      ...r,
      dailyTotal: dailyTotal,
    };
  });

  readingsWithDailyTotal.forEach((row) =>
    worksheet.addRow({
      ...row,
      timestamp: formatTimestampToPolish(+row.timestamp),
    }),
  );

  worksheet.getRow(1).font = { bold: true };

  const aggregated = addGrowingAverageHourly(
    [ReadingsHelpers.aggregateToHourlyReadings(readingsWithDailyTotal)],
    settings.hourlyTarget,
  );

  const worksheetHourly = workbook.addWorksheet(
    settings.sensorNames[+sensorId - 1] + '- godzinowe',
  );

  addHourlyWorkSheets(aggregated, worksheetHourly);

  // Add annotations worksheet if there are any annotations
  if (annotations.length > 0) {
    addAnnotationsWorksheet(workbook, annotations, sensorId);
  }

  const buffer = await workbook.xlsx.writeBuffer(); // Write to memory buffer
  return Buffer.from(buffer);
}

const addAnnotationsWorksheet = (
  workbook: ExcelJS.Workbook,
  annotations: Annotation[],
  sensorId: number,
) => {
  const annotationsWorksheet = workbook.addWorksheet('Adnotacje');

  // Define columns for annotations
  annotationsWorksheet.columns = [
    { header: 'Typ', key: 'type', width: 20 },
    { header: 'Tekst', key: 'text', width: 40 },
    { header: 'Czas rozpoczęcia', key: 'from_timestamp', width: 30 },
    { header: 'Czas zakończenia', key: 'to_timestamp', width: 30 },
    { header: 'Czas trwania (min)', key: 'duration', width: 20 },
  ];

  // Add annotation rows
  annotations
    .filter((a) => a.sensorId === sensorId) // Only include annotations for the current sensor
    .map((annotation) => {
      const fromTimestamp = +annotation.from_timestamp;
      const toTimestamp = annotation.to_timestamp
        ? +annotation.to_timestamp
        : 0;

      // Calculate duration in minutes if both timestamps are available
      //
      let durationMinutes = 0;
      if (toTimestamp) {
        durationMinutes = Math.round(
          (toTimestamp - fromTimestamp) / (1000 * 60),
        );
      }

      return {
        type: getAnnotationTitle(annotation.type), // Convert enum value to string
        text: annotation.text,
        from_timestamp: formatTimestampToPolish(fromTimestamp),
        to_timestamp: toTimestamp
          ? formatTimestampToPolish(toTimestamp)
          : 'N/A',
        duration: durationMinutes !== null ? durationMinutes : 'N/A',
      };
    })
    .forEach((row) => annotationsWorksheet.addRow(row));

  annotationsWorksheet.getRow(1).font = { bold: true };
};

export const addHourlyWorkSheets = (
  aggregated: HourlyReading[],
  worksheet: ExcelJS.Worksheet,
) => {
  // Define columns
  worksheet.columns = [
    { header: 'Czas', key: 'timestamp', width: 30 },
    { header: 'Od', key: 'workStartTime', width: 30 },
    { header: 'Do', key: 'workEndTime', width: 30 },
    { header: 'Stan licznika', key: 'value', width: 30 },
    { header: 'Delta', key: 'delta', width: 30 },
    { header: 'Średnio/min', key: 'average', width: 30 },
    { header: 'Suma', key: 'dailyTotal', width: 30 },
    { header: 'Estymacja', key: 'growingAverageEst', width: 30 },
    { header: 'Średnia narastająca', key: 'growingAveragePerc', width: 30 },
  ];

  let totalSum = 0;

  aggregated
    .map((r: HourlyReading) => {
      const estimated = r.growingAverage?.estimatedProduction ?? 0;
      const estToPrint = estimated > 0 ? estimated : 0;

      const real = r.growingAverage?.realProduction ?? 0;

      const growingPerc = estToPrint > 0 ? real / estToPrint : 0;

      totalSum += r.delta;

      return {
        ...r,
        growingAverageEst: estToPrint,
        growingAveragePerc: growingPerc,
        dailyTotal: totalSum,
        timestamp: formatTimestampToPolish(+r.timestamp),
        workStartTime: formatTimestampToPolish(+r.workStartTime),
        workEndTime: formatTimestampToPolish(+r.workEndTime),
      };
    })
    .forEach((row) => worksheet.addRow(row));

  worksheet.getRow(1).font = { bold: true };
};
