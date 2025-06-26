import {
  Component,
  ElementRef,
  EventEmitter,
  input,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import {
  Annotation,
  GrowingAverage,
  LiveSensorUpdate
} from "@brado/types";
import {ChartComponent} from "../../../components/chart/chart.component";
import {PieChartComponent} from "../../../components/pie-chart/pie-chart.component";
import {DecimalPipe} from "@angular/common";
import {WorkingStatsComponent} from "../../../components/working-stats/working-stats.component";

@Component({
  selector: 'app-sensor-stats',
  templateUrl: './sensor-stats.component.html',
  styleUrls: ['./sensor-stats.component.scss'],
  imports: [ChartComponent, PieChartComponent, WorkingStatsComponent]
})
export class SensorStatsComponent {
  @ViewChild('chartContainer', {static: true}) chartContainer!: ElementRef<HTMLDivElement>;

  @Input({required: true}) data!: LiveSensorUpdate;
  @Input() hourlyTarget= 0;
  @Input() sensorName= '';
  @Input() isDashboardMode=  false

  @Output() reloadAnnotations = new EventEmitter()

  annotations = input<Annotation[]>([])

  onReloadAnnotations() {
    this.reloadAnnotations.emit()
  }

  public get growingAverage(): GrowingAverage {

    const lastReading = this.data.readings.sort((a,b) => +b.timestamp - +a.timestamp)[0]

    if(!lastReading || !lastReading.growingAverage) {
      return {
        estimatedProduction: 0,
        realProduction: 0
      } as GrowingAverage;
    }

    return lastReading.growingAverage;
  }
}
