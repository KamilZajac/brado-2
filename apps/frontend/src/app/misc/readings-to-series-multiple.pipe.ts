import { Pipe, PipeTransform } from '@angular/core';
import {HourlyReading, LiveReading} from "@brado/types";

@Pipe({
  name: 'readingsToSeriesMultiple',
  standalone: true
})
export class ReadingsToSeriesMultiplePipe implements PipeTransform {
  transform(data: LiveReading[][] | HourlyReading[][], key: string): any {
    if (!Array.isArray(data) || data.length === 0) return [];

    // Bierzemy pierwszy zakres jako bazę do wyrównania
    const referenceStart = +data[0][0]?.timestamp; // timestamp w ms

    return data.map((series, index) => {
      if (!series.length) return {name: `Sensor ${index + 1}`, data: []};

      const originalStart = +series[0].timestamp; // start danego zakresu

      return {
        name: `Sensor ${series[0]?.sensorId ?? index + 1}`,
        data: series.map(reading => ({
          x: referenceStart + (+reading.timestamp - originalStart), // przesunięty x
          y: reading.hasOwnProperty(key) ? (reading as any)[key] : reading.value,
          originalX: +reading.timestamp, // zapamiętajmy oryginalny timestamp
          data: {...reading}
        }))
      };
    });

  }
}


