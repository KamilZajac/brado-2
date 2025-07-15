import {Component, effect, inject, input, Input} from '@angular/core';
import {
  DailyWorkingSummary,
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
    DatePipe,
  ]
})
export class WorkingStatsComponent  {
  @Input({required: true}) sensorId!: string
  @Input({required: true}) isAdmin = false

  @Input() public isMultipleDays: boolean = false

  public dataStore = inject(DataStore)

  @Input({required: true}) workingSummary!: DailyWorkingSummary

  readings = input<LiveReading[] | HourlyReading[]>([])


  public get MTBF(): number {
    if(!this.workingSummary) {
      return 0;
    }
    return MTBF(this.workingSummary)
  }

  public get MTTR(): number {
    if(!this.workingSummary) {
      return 0;
    }
    return MTTR(this.workingSummary)
  }
}
