import {HourlyReading, LiveReading} from "@brado/types";


export class ReadingsHelpers {

    static aggregateToHourlyReadings(readings: LiveReading[]): HourlyReading[] {
        if (readings.length === 0) return [];

        const sorted = [...readings].sort((a, b) => +a.timestamp - +b.timestamp);

       const grouped: { [hour: string]: LiveReading[] } = {};

        for (const reading of sorted) {
            const time = +reading.timestamp;
            const date = new Date(time);
            const hourStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours());

            console.log(hourStart)
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

            let total = 0;
            const deltas: number[] = [];

            for (let i = 1; i < entries.length; i++) {
                let diff = entries[i].value - entries[i - 1].value;
                if (diff < 0) {
                    // licznik został wyzerowany — liczymy od zera
                    diff = entries[i].value;
                }
                deltas.push(diff);
                total += diff;
            }

            const average = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
            const min = deltas.length > 0 ? Math.min(...deltas) : 0;
            const max = deltas.length > 0 ? Math.max(...deltas) : 0;

            result.push({
                sensorId: first.sensorId,
                timestamp: hourTimestamp.toString(),
                value: last.value,
                total,
                average,
                min,
                max,
            });
        }

        return result;
    }
}
