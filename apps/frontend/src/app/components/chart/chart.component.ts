import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {HourlyReading, LiveReading} from "@brado/types";
import {ReadingsToSeriesMultiplePipe} from "../../misc/readings-to-series-multiple.pipe";
import {ReadingsToSeriesPipe} from "../../misc/readings-to-series.pipe";
import {BarController, BarElement, CategoryScale, ChartData, ChartOptions} from 'chart.js';
import {BaseChartDirective} from 'ng2-charts';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
  LineOptions
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

import 'chartjs-adapter-date-fns';
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(
  LineController,
  BarController,
  BarElement,
  CategoryScale,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  annotationPlugin
);

const allowedKeys = ['delta', 'value', 'average', 'dailyTotal'];

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  imports: [BaseChartDirective],
  providers: [ReadingsToSeriesMultiplePipe, ReadingsToSeriesPipe]
})
export class ChartComponent implements OnInit {
  @Input() data: HourlyReading[] | LiveReading[] = [];
  @Input() dataMultiple: HourlyReading[][] | LiveReading[][] = [];
  @Input() disableAnimation = false;
  @Input() isLive = false;
  @Input() hourlyTarget = 5000;

  @Input() chartType: 'line' | 'bar' = 'line';
  @Input() keyToDisplay: 'total' | 'value' | 'average' | 'delta' | 'dailyTotal' = 'value';

  chartData!: ChartData<'line'>;
  chartOptions: ChartOptions = {}



  ngOnInit() {
    this.buildChartOptions()

    this.prepareChart();


    console.log(this.chartOptions)
  }

  ngOnChanges() {
    this.prepareChart();
  }

  buildChartOptions () {
    this.chartOptions = {
      responsive: true,
      animation: {
        duration: this.disableAnimation ? 0 : 2000,
      },
      plugins: {
        legend: {
          display: false,
        },
        annotation: {
          annotations: {
            ...(this.getTarget ? {
              thresholdLine: {
                type: 'line',

                yMin: this.getTarget,
                yMax: this.getTarget,

                borderColor: 'red',
                borderWidth: 2,
                borderDash: [6, 6], // optional dashed line
                label: {
                  display: true,
                  content: 'Cel',
                  position: 'start',
                  backgroundColor: 'rgba(255,0,0,0.1)',
                  color: '#000'
                }
              }

            } : {} ),
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            drag: {
              enabled: true
            },
            mode: 'xy',
          }
        }
      },
      scales: {
        x: {
          type: 'time',  // this now works
          time: {
            unit: 'hour',
            tooltipFormat: 'yyyy-MM-dd HH:mm:ss',
            displayFormats: {
              // minute: 'HH:mm',
              hour: 'HH:mm',
              // second: 'HH:mm:ss'
            }
          },
          title: {
            display: true,
            text: 'Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Value'
          }
        }
      }
    };
  }

  prepareChart() {

    let datasets: any = [];

    if (this.dataMultiple.length > 0) {
      datasets = (this.dataMultiple.map((dataset, index) => ({
        label: `Dataset ${index + 1}`,
        data: dataset.map((read) => ({
          x: +read.timestamp,
          y: +read.value
        })),
        fill: false,
        tension: 0.1,
        borderColor: this.getColorForIndex(index), // Funkcja pomocnicza, aby nadać różne kolory
        backgroundColor: this.getColorForIndex(index),
      })))
    }
    ;
    if (this.data.length > 0) {
      datasets = [
        {
          label: 'Sensor Values',
          data: (this.data).map((read) => ({
            x: +read.timestamp,
            y: +(read as any)[this.keyToDisplay],
          })),
          fill: false,
          tension: 0.1,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
        },
      ]
    }

    // console.log(datasets)
    this.chartData = {
      datasets
    }

    // console.log(this.chartData)
  }


  selectChartType(type: 'bar' | 'line') {
    this.chartType = type;

  }

  getColorForIndex(index: number): string {
    const colors = ['#3b82f6', '#34d399', '#f97316', '#e11d48', '#8b5cf6'];
    return colors[index % colors.length]; // Wybieraj kolory cyklicznie
  }


  get getTarget() {


    // if (this.isLive) {
      switch (this.keyToDisplay) {
        case 'value':
          return null;
        case 'delta':
          return this.isLive ? this.hourlyTarget / 60 : this.hourlyTarget
        case 'dailyTotal':
          return this.hourlyTarget * 8
        case 'average':
          return this.hourlyTarget / 60
        default:
          return 0


      }
    // }

    // if (this.keyToDisplay == 'average') {
    //
    //
    // }
    // console.log(this.keyToDisplay)
    // return 80;
  }


  public get availableKeys(): string[] {
    // console.log(this.data)
    const arr = this.dataMultiple.length > 0 ? [...this.dataMultiple[0]] : [...this.data];
    return Object.keys([...arr][0]).filter(k => allowedKeys.includes(k))
  }

  selectDataKey(key: any) {
    this.keyToDisplay = key;
    this.prepareChart();
    this.buildChartOptions()

  }

  getKeyName(key: string) {
    if (key === 'delta') {
      return 'Sztuki'
    } else if (key === 'average') {
      return 'Średnia / h'
    } else if (key === 'value') {
      return 'Licznik'
    } else if (key === 'dailyTotal') {
      return 'Dziś'
    } else {
      return key
    }
  }
}


