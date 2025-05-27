import {Component, OnInit, WritableSignal, ViewChildren} from '@angular/core';
import {SocketService} from "../../services/socket/socket.service";
import {firstValueFrom, Observable, Subject} from "rxjs";
import {DataService, getWeeklyTimestamps} from "../../services/data/data.service";

import {KeyValuePipe} from "@angular/common";
import { signal } from '@angular/core';
import {Annotation, HourlyReading} from "@brado/types";
import {LineChartComponent} from "../../components/line-chart/line-chart.component";
import {ReadingsToSeriesMultiplePipe} from "../../misc/readings-to-series-multiple.pipe";
import {ChartComponent} from "../../components/chart/chart.component";
import {ReadingsToSeriesPipe} from "../../misc/readings-to-series.pipe";
import { IonContent, IonRow } from '@ionic/angular/standalone';
import {AnnotationService} from "../../services/annotation/annotation.service";
import {ChartWrapperDirective} from "../../directives/chart-wrapper.directive";


// const getStartOfWeek = () => {
//   const now = new Date();
//
//   const day = now.getDay(); // 0 (niedziela) → 6 (sobota)
//   const diff = now.getDate() - day + (day === 0 ? -6 : 1); // przesunięcie do poniedziałku
//
//   const monday = new Date(now.setDate(diff));
//   monday.setHours(0, 0, 0, 0); // ustawia czas na 00:00:00
//
//   return monday;
// }



@Component({
  selector: 'app-weekly',
  templateUrl: './weekly.component.html',
  styleUrls: ['./weekly.component.scss'],
  providers: [DataService],
  imports: [ KeyValuePipe, IonContent, ChartComponent, IonRow]
})
export class WeeklyComponent extends ChartWrapperDirective implements OnInit {
  weeklyReadings = signal<{ [key: string]: HourlyReading[] }>({});
  hourlyTarget = 5000;

  override mode: 'weekly' | 'live' = 'weekly';
  // public chartOptions: {[key: string] : ChartOptions } = {};

  public totalProductionPerSensor: number[][] = [];


  constructor(private socketService: SocketService, private dataService: DataService , annotationService: AnnotationService) {
    super(annotationService)

  }

  public override ngOnInit(): void {
    super.ngOnInit();
    this.getWeeklyData()
  }


  private async getWeeklyData() {

    const {from, to } = getWeeklyTimestamps()
    const hourlyData = await firstValueFrom(this.dataService.getHourlyBetween(from, to));
    this.weeklyReadings.update(() => {
      const uniqueSensors = Array.from(new Set(hourlyData.map(r => r.sensorId)));
      const sensorObject: {[key: string]: HourlyReading[]} = {};
      uniqueSensors.forEach(sensor => {
        sensorObject[sensor] = hourlyData.filter(r => r.sensorId === sensor);
      })

      return sensorObject
    });

  }

  exportDataToExcel() {
    const {from, to } = getWeeklyTimestamps()

    this.dataService.exportData(from, to).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

}
