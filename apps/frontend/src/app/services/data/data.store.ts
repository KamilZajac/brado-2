import {computed, inject, Injectable, Signal, signal} from "@angular/core";
import {DataService, getWeeklyTimestamps} from "./data.service";
import {addGrowingAverage, GrowingAverage, HourlyReading, LiveReading, LiveUpdate, WorkingPeriod} from "@brado/types";
import {SocketService} from "../socket/socket.service";
import {firstValueFrom, Observable} from "rxjs";
import {SettingsService} from "../settings/settings.service";

@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly api = inject(DataService);

  private readonly _liveData = signal<LiveUpdate>({});
  private readonly _weeklyReadings = signal<{ [key: string]: HourlyReading[] }>({});
  private readonly _workPeriods = signal<{ [key: string]: WorkingPeriod[] }>({});
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly liveData: Signal<LiveUpdate> = computed(() => this._liveData());
  readonly weeklyReadings: Signal<{ [key: string]: HourlyReading[] }> = computed(() => this._weeklyReadings());
  readonly workPeriods: Signal<{ [key: string]: WorkingPeriod[] }> = computed(() => this._workPeriods());
  readonly loading: Signal<boolean> = computed(() => this._loading());
  readonly error: Signal<string | null> = computed(() => this._error());

  getLatestWorkingPeriodForKey(key: string): Signal<WorkingPeriod | undefined> {
    return computed(() => {
      const periods = this._workPeriods()[key] ?? [];
      if (periods.length === 0) return undefined;

      const sorted = periods.sort((a,b) => +b.start - +a.start);

      return sorted[0]
    });
  }



  constructor(private socketService: SocketService, private settings: SettingsService) {
    this.socketService.onLiveUpdate().subscribe(res => {
      this.mergeLiveUpdate(res);
    })
  }

  mergeLiveUpdate(newData: LiveUpdate) {
    this._liveData.update(current => {
      const updated = {...current};

      for (const key in newData) {
        if (updated[key]) {

          const mergedReadings =
            this.removeDuplicateReadings([...updated[key].readings, ...newData[key].readings]).sort((a,b) => +a.timestamp - +b.timestamp)

          const newReadings = addGrowingAverage(mergedReadings, this.getHourlyTarget());
          updated[key] = {
            readings: newReadings,
            growingAverage: newReadings[newReadings.length-1].growingAverage || {} as GrowingAverage,
            average60: this.getLast60Average(newReadings)
          };
        } else {
          // new sensor data
          updated[key] = newData[key];
        }
      }
      return updated;
    });
  }

  async loadWorkingPeriods() {
    const workPeriods = await firstValueFrom(this.api.getWorkingPeriods());

    this._workPeriods.update(() => {
      const uniqueSensors = Array.from(new Set(workPeriods.map(r => r.sensorId)));
      const sensorObject: {[key: string]: WorkingPeriod[]} = {};
      uniqueSensors.forEach(sensor => {
        sensorObject[sensor] = workPeriods.filter(r => r.sensorId === sensor);
      })

      return sensorObject
    });
  }

  loadInitialLiveData() {
    this._loading.set(true);
    this._error.set(null);

    this.api.getInitialLiveData().subscribe({
      next: (liveUpdate) => {
        Object.keys(liveUpdate).forEach((key) => {
          const readings =  addGrowingAverage(liveUpdate[key].readings.sort((a,b) => +a.timestamp - +b.timestamp), this.getHourlyTarget())
          liveUpdate[key] = {...liveUpdate[key], readings: this.removeDuplicateReadings(readings)}
        })

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
        sensorObject[sensor] = this.removeDuplicateReadings(hourlyData.filter(r => r.sensorId === sensor)) as HourlyReading[];
      })

      return sensorObject
    });
  }

  public async createUpdateLiveReading(data: LiveReading) {
    const result = await firstValueFrom(this.api.createOrUpdateLiveReading(data));

    if(result) {
      this.loadInitialLiveData()
    }
  }


  removeDuplicateReadings(readings: LiveReading[] | HourlyReading[]): LiveReading[] | HourlyReading[] {
    const seen = new Set<string>();

    return readings.filter(reading => {
      const key = `${reading.timestamp}|${reading.value}|${reading.sensorId}|${reading.delta}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  getLast60Average(readings: LiveReading[]) {
    const now = Date.now(); // current time in milliseconds
    const oneHourAgo = now - 60 * 60 * 1000; // 1 hour ago in ms

    const lastHourReadings = readings.filter(reading =>
      +reading.timestamp >= oneHourAgo
    );

    if (lastHourReadings.length < 2) return 0;

    let weightedSum = 0;
    let totalDuration = 0;

    for (let i = 0; i < lastHourReadings.length - 1; i++) {
      const curr = lastHourReadings[i];
      const next = lastHourReadings[i + 1];

      const duration = +next.timestamp - +curr.timestamp;
      const avgValue = (curr.delta + next.delta) / 2;

      weightedSum += avgValue * duration;
      totalDuration += duration;
    }

    if (totalDuration === 0) return lastHourReadings[0].delta;

    return weightedSum / totalDuration;

  }

  private getHourlyTarget(): number {
    const settingsJSON = localStorage.getItem('settings');
    if(!settingsJSON){
      return 5250
    }
    const settings = JSON.parse(settingsJSON);
    return settings.hourlyTarget;
  }


}
