import {AfterViewInit, Component, ElementRef, EventEmitter, input, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Annotation, LiveSensorUpdate} from "@brado/types";
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

  @Output() reloadAnnotations = new EventEmitter()

  annotations = input<Annotation[]>([])


  constructor(private hostRef: ElementRef<HTMLElement>) {
  }


  onReloadAnnotations() {
    console.log('reload form sensordstsat')

    this.reloadAnnotations.emit()
  }
}
