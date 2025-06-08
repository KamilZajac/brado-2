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


  constructor() {}


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
}
