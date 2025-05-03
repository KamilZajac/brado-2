import { Component, OnInit } from '@angular/core';
import {DatePickerComponent, TimeRange} from "../../components/date-picker/date-picker.component";
import {DataService} from "../../services/data/data.service";
import { firstValueFrom, forkJoin } from 'rxjs';
import { HourlyReading } from '@brado/types';
import {LineChartComponent} from "../../components/line-chart/line-chart.component";
import { KeyValuePipe } from '@angular/common';
import {ReadingsToSeriesPipe} from "../../misc/readings-to-series.pipe";
import {ChartComponent} from "../../components/chart/chart.component";

@Component({
  selector: 'app-compare',
  templateUrl: './compare.component.html',
  styleUrls: ['./compare.component.scss'],
  imports: [
    DatePickerComponent,
    LineChartComponent,
    KeyValuePipe,
    ReadingsToSeriesPipe,
    ChartComponent
  ]
})
export class CompareComponent {

  readings: {[key: string]: HourlyReading[][]} = {};
  public isDataLoaded: boolean = false;


  constructor(private dataService: DataService) { }

  runCompare(ranges: TimeRange[]) {


    forkJoin(ranges.map(range => this.dataService.getHourlyBetween(+range.from, +range.to) ))
      .subscribe(results => {

        console.log(results)
        results.forEach((result, index) => {

          const uniqueSensors = Array.from(new Set(result.map(r => r.sensorId)));

          uniqueSensors.forEach(sensor => {
            if(!this.readings.hasOwnProperty(sensor)) {
              this.readings[sensor] = [];
            }

            this.readings[sensor] = [...this.readings[sensor], result.filter(r => r.sensorId === sensor)];
          })

        })

        this.isDataLoaded = true
      });
  }
}


function alignDataToReference(
  readings: HourlyReading[],
  referenceStart: number,     // timestamp (ms) - początek zakresu A
  originalStart: number       // timestamp (ms) - początek zakresu B
): HourlyReading[] {

  return readings.map(reading => {
    const originalTs = new Date(+reading.timestamp).getTime();
    const offset = originalTs - originalStart;

    console.log(reading.timestamp)
    console.log(originalTs);
    return {
      ...reading,
      timestamp: new Date(referenceStart + offset).toISOString()
    };
  });
}
