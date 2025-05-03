import { Component, Input, OnInit } from '@angular/core';
import { ApexChart, NgApexchartsModule } from 'ng-apexcharts';
import {HourlyReading} from "@brado/types";

// export const readingsToSeries = (readings: HourlyReading): ApexAxisChartSeries => {
//
// }

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  imports: [NgApexchartsModule]
})
export class ChartComponent implements OnInit{
  @Input() chartSeries: ApexAxisChartSeries = [];
  @Input() chartType: 'line' | 'bar' = 'line';


  public ngOnInit() {
    console.log(this.chartSeries)


  }
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
}


