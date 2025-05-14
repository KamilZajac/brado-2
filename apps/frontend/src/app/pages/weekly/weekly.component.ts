import {Component, OnInit, WritableSignal, ViewChildren} from '@angular/core';
import {SocketService} from "../../services/socket/socket.service";
import {firstValueFrom, Observable, Subject} from "rxjs";
import {DataService, getWeeklyTimestamps} from "../../services/data/data.service";

import {KeyValuePipe} from "@angular/common";
import { signal } from '@angular/core';
import {HourlyReading} from "@brado/types";
import {LineChartComponent} from "../../components/line-chart/line-chart.component";
import {ReadingsToSeriesMultiplePipe} from "../../misc/readings-to-series-multiple.pipe";
import {ChartComponent} from "../../components/chart/chart.component";
import {ReadingsToSeriesPipe} from "../../misc/readings-to-series.pipe";
import { IonContent } from '@ionic/angular/standalone';


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
  imports: [ KeyValuePipe, IonContent, ChartComponent, ReadingsToSeriesPipe]
})
export class WeeklyComponent implements OnInit {
  weeklyReadings = signal<{ [key: string]: HourlyReading[] }>({});
  hourlyTarget = 5000;


  // public chartOptions: {[key: string] : ChartOptions } = {};

  public totalProductionPerSensor: number[][] = [];


  constructor(private socketService: SocketService, private dataService: DataService ) {


  }




  public ngOnInit(): void {

    console.log('AAAA')
    this.getWeeklyData();



  }





  private async getWeeklyData() {

    const {from, to } = getWeeklyTimestamps()
    console.log(getWeeklyTimestamps())
    const hourlyData = await firstValueFrom(this.dataService.getHourlyBetween(from, to));
    console.log(hourlyData)
    this.weeklyReadings.update(() => {

      const uniqueSensors = Array.from(new Set(hourlyData.map(r => r.sensorId)));

      const sensorObject: {[key: string]: HourlyReading[]} = {};

      uniqueSensors.forEach(sensor => {
        sensorObject[sensor] = hourlyData.filter(r => r.sensorId === sensor);
      })

      return sensorObject
    });

  }
  //
  // public setTotalProductionPerSensor() : void{
  //   const uniqueSensors = new Set(this.data.map(r => r.sensorId));
  //   console.log(uniqueSensors)
  //   this.totalProductionPerSensor = Array.from(uniqueSensors).map(sensor => [sensor, Math.max(...this.data.filter(r => r.sensorId === sensor).map(r => r.value))])
  //   console.log(this.totalProductionPerSensor)
  // }
}
