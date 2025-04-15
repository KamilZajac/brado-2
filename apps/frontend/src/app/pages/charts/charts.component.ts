import {Component, OnInit, WritableSignal, ViewChildren} from '@angular/core';
import {SocketService} from "../../services/socket/socket.service";
import {firstValueFrom, Observable, Subject} from "rxjs";
import {DataReading} from "@brado/shared-models";
import {DataService} from "../../services/data/data.service";
import {NgApexchartsModule} from "ng-apexcharts";
import {
  ChartComponent,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexTitleSubtitle
} from "ng-apexcharts";
import {KeyValuePipe} from "@angular/common";
import { signal } from '@angular/core';


export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  title: ApexTitleSubtitle;
};

const getStartOfWeek = () => {
  const now = new Date();

  const day = now.getDay(); // 0 (niedziela) → 6 (sobota)
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // przesunięcie do poniedziałku

  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0); // ustawia czas na 00:00:00

  return monday;
}

const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today
}

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss'],
  providers: [DataService],
  imports: [NgApexchartsModule, KeyValuePipe]
})
export class ChartsComponent  implements OnInit {
  public dataLoaded = false;

  public chartsData: Record<string, WritableSignal<ApexAxisChartSeries>> = {};

  public data: DataReading[] = []

  // public chartOptions: {[key: string] : ChartOptions } = {};

  public totalProductionPerSensor: number[][] = [];

  public chart:ApexChart  = {
    height: 350,
    type: "line"
  }
  // title: ApexTitleSubtitle = {
  //   text: `Sensor ${sensorID}`
  // }
  public xaxis:ApexXAxis = {
    type: 'datetime'
    // categories: this.data.filter(r => r.sensorId === sensorID).map(r => r.timestamp)
  }

  constructor(private socketService: SocketService, private dataService: DataService ) {


  }

  private initLiveCharts() {
    const uniqueSensors = new Set(this.data.map(r => r.sensorId));

    Array.from(uniqueSensors).forEach((sensorID) => {
      if (!this.chartsData[sensorID]) {

      this.chartsData[sensorID] = signal<ApexAxisChartSeries>([
        {
          name: `Licznik: ${sensorID}`,
          data: this.data.filter(r => r.sensorId === sensorID).map(r => ({x: r.timestamp, y: r.value})),
        }
      ]);
      }
    });
  }


  public ngOnInit(): void {
    this.socketService.onNewReading().subscribe((readings: DataReading[]) => {
      console.log('Nowy odczyt z backendu:', readings);
      // Możesz zaktualizować tutaj wykresy
      this.data.push(...readings);

      readings.forEach((reading) => {

        this.chartsData[reading.sensorId].update(series => {

        // if(this.chartOptions[reading.sensorId].series.hasOwnProperty('data')) {
        //   this.chartOptions[reading.sensorId].series[0].data = [...currentData, {x: reading.timestamp, y: reading.value}];
        // }
          const current = series[0].data as any[];
          return [
            {
              ...series[0],
              data: [...current, { x: reading.timestamp, y: reading.value }]
            }
          ];

      }) });


      this.setTotalProductionPerSensor();

    });

    this.getTodayData();

  }





  private async getTodayData() {
    this.data = await firstValueFrom(this.dataService.getDataAfterTimestamp(getStartOfToday()));
    this.initLiveCharts();
    this.setTotalProductionPerSensor();
    this.dataLoaded = true;
  }

  public setTotalProductionPerSensor() : void{
    const uniqueSensors = new Set(this.data.map(r => r.sensorId));
    console.log(uniqueSensors)
    this.totalProductionPerSensor = Array.from(uniqueSensors).map(sensor => [sensor, Math.max(...this.data.filter(r => r.sensorId === sensor).map(r => r.value))])
    console.log(this.totalProductionPerSensor)
  }
}
