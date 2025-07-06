import { HourlyReading, LiveReading } from '@brado/types';
import { DateTime } from 'luxon';

export class ReadingsHelpers {
  static aggregateToHourlyReadings(readings: LiveReading[]): HourlyReading[] {
    if (readings.length === 0) return [];

    const sorted = [...readings].sort((a, b) => +a.timestamp - +b.timestamp);

    const grouped: { [hour: string]: LiveReading[] } = {};

    for (const reading of sorted) {
      const time = +reading.timestamp;
      const date = new Date(time);
      const hourStart = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
      );

      if (!grouped[hourStart]) {
        grouped[hourStart] = [];
      }
      grouped[hourStart].push(reading);
    }

    const result: HourlyReading[] = [];

    for (const hourTimestampStr in grouped) {
      const hourTimestamp = Number(hourTimestampStr);
      const entries = grouped[hourTimestamp];

      const first = entries[0];
      const last = entries[entries.length - 1];

      const deltas: number[] = entries.map((reading) => reading.delta);
      const delta = deltas.reduce((a, b) => a + b, 0);
      const average =
        deltas.length > 0
          ? deltas.reduce((a, b) => a + b, 0) / deltas.length
          : 0;
      const min = deltas.length > 0 ? Math.min(...deltas) : 0;
      const max = deltas.length > 0 ? Math.max(...deltas) : 0;

      const workStartTime = entries
        .sort((a, b) => +a.timestamp - +b.timestamp)
        .find((r: LiveReading) => r.delta > 10)?.timestamp;
      const workEndTime = entries
        .sort((a, b) => +b.timestamp - +a.timestamp)
        .find((r: LiveReading) => r.delta > 10)?.timestamp;

      result.push({
        id: 0,
        sensorId: first.sensorId,
        timestamp: hourTimestamp.toString(),
        value: last.value,
        delta: delta,
        workStartTime: workStartTime || '0',
        workEndTime: workEndTime || '0',
        average,
        min,
        max,
      });
    }

    return result;
  }

  static tsToPolishDate(ts: number) {
    return DateTime.fromMillis(ts, {
      zone: 'Europe/Warsaw',
    });
  }
}
