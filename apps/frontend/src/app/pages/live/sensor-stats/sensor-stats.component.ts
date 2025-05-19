import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {LiveSensorUpdate} from "@brado/types";
import {ChartComponent} from "../../../components/chart/chart.component";
import {PieChartComponent} from "../../../components/pie-chart/pie-chart.component";

@Component({
  selector: 'app-sensor-stats',
  templateUrl: './sensor-stats.component.html',
  styleUrls: ['./sensor-stats.component.scss'],
  imports: [ChartComponent, PieChartComponent]
})
export class SensorStatsComponent {
  @ViewChild('chartContainer', {static: true}) chartContainer!: ElementRef<HTMLDivElement>;

  @Input({required: true}) data!: LiveSensorUpdate;
  @Input({required: true}) sensorID!: string;
  @Input() hourlyTarget= 0;
  @Input() sensorName= '';

  constructor(private hostRef: ElementRef<HTMLElement>) {
  }


}
