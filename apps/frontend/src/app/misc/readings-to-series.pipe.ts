import { Pipe, PipeTransform } from '@angular/core';
import {HourlyReading, LiveReading} from "@brado/types";

@Pipe({
  name: 'readingsToSeries',
  standalone: true
})
export class ReadingsToSeriesPipe implements PipeTransform {
  transform(data: LiveReading[]| HourlyReading[], key: string): any {
    if (!Array.isArray(data) || data.length === 0) return [];

      return [
        {
        name: `Sensor ${data[0].sensorId}`,
        data:  data.map(reading => ({
          x: +reading.timestamp, // przesunięty x
          y: reading.hasOwnProperty(key) ? (reading as any)[key] : reading.value,
          data: {...reading}
        }))
      }
      ]

  }
}
