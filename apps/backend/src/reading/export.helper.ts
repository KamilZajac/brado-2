// export.service.ts (or any service)
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { HourlyReading } from '@brado/types';
import { DateTime } from 'luxon';

function formatTimestampToPolish(msTimestamp: number): string {
  return DateTime.fromMillis(msTimestamp, { zone: 'Europe/Warsaw' }).toFormat(
    'dd.MM.yyyy HH:mm',
  );
}

export async function exportToExcel(
  readings: HourlyReading[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const uniqueSensorIds = Array.from(
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
