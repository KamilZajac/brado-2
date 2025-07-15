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
  Annotation, DailyWorkingSummary,
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
  @Input({required: true}) sensorId!: string
  @Input({required: true}) workingSummary!: DailyWorkingSummary
  @Input() hourlyTarget= 0;
  @Input() sensorName= '';
  @Input() isDashboardMode = false
  @Input() isAdminDashboard = false

  @Output() reloadAnnotations = new EventEmitter()

  onReloadAnnotations() {
    this.reloadAnnotations.emit()
  }
}
