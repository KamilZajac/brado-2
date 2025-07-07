import {Component, effect, inject, input, Input} from '@angular/core';
import {
  HourlyReading,
  LiveReading,
  MTBF,
  MTTR, WorkingPeriod
} from "@brado/types";
import {DatePipe, DecimalPipe} from "@angular/common";
import {DataStore} from "../../services/data/data.store";
import {AnnotationsStore} from "../../services/annotation/annotations.store";

@Component({
  selector: 'app-working-stats',
  templateUrl: './working-stats.component.html',
  styleUrls: ['./working-stats.component.scss'],
  imports: [
    DecimalPipe,
  ]
})
export class WorkingStatsComponent  {
  @Input({required: true}) sensorId!: string

  public totalUnits = 0;

  @Input() public isMultipleDays: boolean = false


  public dataStore = inject(DataStore)
  public dailyWorkingStats  = this.dataStore.statsForCurrentPeriod

  readings = input<LiveReading[] | HourlyReading[]>([])

  constructor() {
    effect(() => {
      if(!this.isMultipleDays) {


        console.log(this.dailyWorkingStats())
        // this.sensorId = this.readings()[0].sensorId

      const currentPeriod = this.dataStore.getLatestWorkingPeriodForKey(this.sensorId)();

      // if(currentPeriod) {
      //
      //   this.currentPeriod = currentPeriod;
      //   const readings = this.readings().filter(r => {
      //     if (currentPeriod.end) {
      //       return +r.timestamp >= +currentPeriod.start && +r.timestamp <= +currentPeriod.end
      //     } else {
      //       return +r.timestamp >= +currentPeriod.start
      //     }
      //
      //
      //
      //   })
      //   this.totalUnits = readings.reduce((prev, curr) => curr.delta + prev, 0);
      //   this.dailyWorkingStats =  getDailyWorkingSummary(readings, this.annotations())
      // } else {
      //
      //   this.dailyWorkingStats = getSummaryForMultipleDays(this.readings(), this.annotations())
      //
      // }

      }


    })
  }

  public get MTBF(): number {
    if(!this.dailyWorkingStats) {
      return 0;
    }
    return MTBF(this.dailyWorkingStats()[this.sensorId])
  }

  public get MTTR(): number {
    if(!this.dailyWorkingStats) {
      return 0;
    }
    return MTTR(this.dailyWorkingStats()[this.sensorId])
  }
}
