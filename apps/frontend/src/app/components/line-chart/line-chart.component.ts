import { Component, Input, OnInit } from '@angular/core';
import {HourlyReading, LiveReading} from "@brado/types";
import { ApexChart, NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
  imports: [NgApexchartsModule]
})
export class LineChartComponent  implements OnInit {
  @Input() data: HourlyReading[] = [];

  public chart:ApexChart  = {
    height: 350,
    type: "bar",
    animations: {
      enabled: false,
    },
  }


  public xaxis:ApexXAxis = {
    type: 'datetime',
    labels: {
      datetimeUTC: false,
      format: 'HH:mm',
    },
  }

  constructor() { }

  ngOnInit() {}


  public get chartReadings(): ApexAxisChartSeries {

    return [
      {
        name: `Licznik`,
        data: this.data.map(r => ({x: parseInt(r.timestamp), y: r.total})),
      }
    ]
  }
}
