import {computed, inject, Injectable, Signal, signal} from "@angular/core";
import {UsersApiService} from "../users/users.service";
import {TempService, } from "./temp.service";
import {HourlyReading, LiveReading, LiveUpdate, TempReading} from "@brado/types";
import {SocketService} from "../socket/socket.service";
import {firstValueFrom} from "rxjs";
import {SettingsService} from "../settings/settings.service";

@Injectable({ providedIn: 'root' })
export class TemperatureStore {
  private readonly api = inject(TempService);

  private readonly _liveData = signal<{ [key: string]: TempReading[] }>({});

  readonly liveData: Signal<{ [key: string]: TempReading[] }> = computed(() => this._liveData());


  readonly currentTemps: Signal<{ [key: string]: number }> = computed(() => {
    const data = this.liveData();
    const result: { [key: string]: number } = {};

    for (const [id, readings] of Object.entries(data)) {
      if (!readings.length) {
        result[id] = NaN;
        continue;
      }
      result[id] = readings.sort((a,b) => +b.timestamp - +a.timestamp)[0].temperature
    }
    return result;
  });
  readonly avgTempsLastHour: Signal<{ [key: string]: number }> = computed(() => {
    const data = this.liveData();
    const result: { [key: string]: number } = {};

    for (const [id, readings] of Object.entries(data)) {
      if (!readings.length) {
        result[id] = NaN;
        continue;
      }

      // Find the newest timestamp for this thermometer
      const latestTimestamp = Math.max(...readings.map(r => +r.timestamp));
      const oneHourBack = latestTimestamp - 24 * 60 * 60 * 1000;

      // Filter readings within the last 24 hour
      const recentReadings = readings.filter(r => +r.timestamp >= oneHourBack);

      const avg = recentReadings.length
        ? recentReadings.reduce((sum, r) => sum + r.temperature, 0) / recentReadings.length
        : NaN;

      result[id] = avg;
    }

    return result;
  });

  constructor(private socketService: SocketService) {
    this.socketService.onLiveTempUpdate().subscribe(newTemps => {

      this._liveData.update((state) => {
        newTemps.forEach((reading: TempReading) => {
          if(!state[reading.sensorId]) {
            state[reading.sensorId] = [];
           }
          state[reading.sensorId] = [...state[reading.sensorId], reading];
        })

        return state
      })

    })
  }


  async loadAll() {
    const hourlyData = await firstValueFrom(this.api.getAll());
    this._liveData.update(() => {
      const uniqueSensors = Array.from(new Set(hourlyData.map(r => r.sensorId)));
      const sensorObject: {[key: string]: TempReading[]} = {};
      uniqueSensors.forEach(sensor => {
        sensorObject[sensor] = hourlyData.filter(r => r.sensorId === sensor);
      })

      return sensorObject
    });
  }


  async loadLatest() {
    const tempReadings = await firstValueFrom(this.api.getLatest());
    this._liveData.update(() => {
      const uniqueSensors = Array.from(new Set(tempReadings.map(r => r.sensorId)));
      const sensorObject: {[key: string]: TempReading[]} = {};
      uniqueSensors.forEach(sensor => {
        sensorObject[sensor] = tempReadings.filter(r => r.sensorId === sensor);
      })

      return sensorObject
    });
  }
}
