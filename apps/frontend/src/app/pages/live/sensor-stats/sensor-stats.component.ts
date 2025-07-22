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
import {ReadingsTableComponent} from "../../../components/readings-table/readings-table.component";
import {FormsModule} from "@angular/forms";

@Component({
  selector: 'app-sensor-stats',
  templateUrl: './sensor-stats.component.html',
  styleUrls: ['./sensor-stats.component.scss'],
  imports: [ChartComponent, PieChartComponent, WorkingStatsComponent, ReadingsTableComponent, FormsModule]
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

  // Track the current view mode (chart or table)
  viewMode: 'chart' | 'table' = 'chart';

  // Toggle between chart and table views
  toggleViewMode() {
    this.viewMode = this.viewMode === 'chart' ? 'table' : 'chart';
  }

  // Get sensor names object for the current sensor
  getSensorNamesObject(): { [key: number]: string } {
    const result: { [key: number]: string } = {};
    result[+this.sensorId] = this.sensorName;
    return result;
  }

  onReloadAnnotations() {
    this.reloadAnnotations.emit()
  }
}
