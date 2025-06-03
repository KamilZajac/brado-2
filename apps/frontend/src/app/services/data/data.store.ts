import {computed, inject, Injectable, Signal, signal} from "@angular/core";
import {UsersApiService} from "../users/users.service";
import {DataService, getWeeklyTimestamps} from "./data.service";
import {HourlyReading, LiveReading, LiveUpdate} from "@brado/types";
import {SocketService} from "../socket/socket.service";
import {firstValueFrom} from "rxjs";
import {SettingsService} from "../settings/settings.service";

@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly api = inject(DataService);
  // private readonly settings = inject(SettingsService);


  private readonly _liveData = signal<LiveUpdate>({});
  private readonly _weeklyReadings = signal<{ [key: string]: HourlyReading[] }>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly liveData: Signal<LiveUpdate> = computed(() => this._liveData());
  readonly weeklyReadings: Signal<{ [key: string]: HourlyReading[] }> = computed(() => this._weeklyReadings());
  readonly loading: Signal<boolean> = computed(() => this._loading());
  readonly error: Signal<string | null> = computed(() => this._error());



  constructor(private socketService: SocketService, private settings: SettingsService) {
    this.socketService.onLiveUpdate().subscribe(res => {
      this.mergeLiveUpdate(res);
      console.log('Live update update from socket');
      console.log(res)
    })
  }

  mergeLiveUpdate(newData: LiveUpdate) {
    this._liveData.update(current => {
      const updated = {...current};

      for (const key in newData) {
        if (updated[key]) {
          updated[key] = {
            readings: [...updated[key].readings, ...newData[key].readings],
            growingAverage: {} as any, // Todo
            average60: newData[key].average60
          };
        } else {
          // new sensor data
          updated[key] = newData[key];
        }
      }
      return updated;
    });
  }

  loadInitialLiveData() {
    this._loading.set(true);
    this._error.set(null);

    this.api.getInitialLiveData().subscribe({
      next: (liveUpdate) => {
        Object.keys(liveUpdate).forEach((key) => {
          liveUpdate[key] = {...liveUpdate[key], readings: this.addGrowingAverage(liveUpdate[key].readings)}
        })


        console.log(liveUpdate);

        this._liveData.set(liveUpdate)
      },
      error: (err) => this._error.set('Failed to load liveUpdate'),
      complete: () => this._loading.set(false)
    });
  }

  async loadWeeklyData() {
    const {from, to } = getWeeklyTimestamps()
    const hourlyData = await firstValueFrom(this.api.getHourlyBetween(from, to));
    this._weeklyReadings.update(() => {
      const uniqueSensors = Array.from(new Set(hourlyData.map(r => r.sensorId)));
      const sensorObject: {[key: string]: HourlyReading[]} = {};
      uniqueSensors.forEach(sensor => {
        sensorObject[sensor] = hourlyData.filter(r => r.sensorId === sensor);
      })

      return sensorObject
    });
  }

  addGrowingAverage(readings: LiveReading[]): LiveReading[] {
    const firstReadingWithValue = readings.find(r => r.delta >= 5);

    const settingsJSON = localStorage.getItem('settings');

    if(!firstReadingWithValue || !settingsJSON) {
      console.error('no first reading, or hourly target');
      return readings;
    }

    const settings = JSON.parse(settingsJSON);

    readings = readings.map(r => {
      const minutesSinceFirstReading = Math.floor(
        (+r.timestamp - +firstReadingWithValue.timestamp) / 60000,
      );


      const estimatedProduction = minutesSinceFirstReading * (+settings.hourlyTarget/60);
      const realProduction = r.dailyTotal || 0;


      return {
        ...r, growingAverage: {
          realProduction, estimatedProduction, endTime: r.timestamp, fromTime: firstReadingWithValue.timestamp, sensorId: r.sensorId
        }
      }

    })

    return readings

  }
}
