import {Component, effect, input, Input} from '@angular/core';
import {
  Annotation,
  DailyWorkingSummary,
  getDailyWorkingSummary, getSummaryForMultipleDays,
  HourlyReading,
  LiveReading,
  MTBF,
  MTTR, WorkingPeriod
} from "@brado/types";
import {DatePipe, DecimalPipe} from "@angular/common";
import {DataStore} from "../../services/data/data.store";

@Component({
  selector: 'app-working-stats',
  templateUrl: './working-stats.component.html',
  styleUrls: ['./working-stats.component.scss'],
  imports: [
    DecimalPipe,
    DatePipe
  ]
})
export class WorkingStatsComponent  {
  public dailyWorkingStats: DailyWorkingSummary | null = null;
  public totalUnits = 0;

  @Input() public isMultipleDays: boolean = false
  @Input({required: true}) sensorId!: string

  public currentPeriod?: WorkingPeriod;

  readings = input<LiveReading[] | HourlyReading[]>([])
  annotations = input<Annotation[]>([])


  constructor(private dataStore: DataStore) {
    effect(() => {
      if(!this.isMultipleDays) {

      const currentPeriod = this.dataStore.getLatestWorkingPeriodForKey(this.sensorId)();

      if(currentPeriod) {

        console.log(currentPeriod)

        this.currentPeriod = currentPeriod;
        const readings = this.readings().filter(r => {
          if (currentPeriod.end) {
            return +r.timestamp >= +currentPeriod.start && +r.timestamp <= +currentPeriod.end
          } else {
            return +r.timestamp >= +currentPeriod.start
          }



        })
        console.log(readings)
        this.totalUnits = readings.reduce((prev, curr) => curr.delta + prev, 0);
        this.dailyWorkingStats =  getDailyWorkingSummary(readings, this.annotations())
      } else {

        this.dailyWorkingStats = getSummaryForMultipleDays(this.readings(), this.annotations())

      }

      }


    })
  }

  public get MTBF(): number {
    if(!this.dailyWorkingStats) {
      return 0;
    }
    return MTBF(this.dailyWorkingStats)
  }

  public get MTTR(): number {
    if(!this.dailyWorkingStats) {
      return 0;
    }
    return MTTR(this.dailyWorkingStats)
  }
}
