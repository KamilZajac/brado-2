import {Component, effect, input, Input} from '@angular/core';
import {
  Annotation,
  DailyWorkingSummary,
  getDailyWorkingSummary,
  HourlyReading,
  LiveReading,
  MTBF,
  MTTR
} from "@brado/types";
import {DecimalPipe} from "@angular/common";

@Component({
  selector: 'app-working-stats',
  templateUrl: './working-stats.component.html',
  styleUrls: ['./working-stats.component.scss'],
  imports: [
    DecimalPipe
  ]
})
export class WorkingStatsComponent  {
  @Input() public dailyWorkingStats: DailyWorkingSummary | null = null;

  readings = input<LiveReading[] | HourlyReading[]>([])
  annotations = input<Annotation[]>([])

  constructor() {
    effect(() => {
      this.dailyWorkingStats = getDailyWorkingSummary(this.readings(), this.annotations())
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
