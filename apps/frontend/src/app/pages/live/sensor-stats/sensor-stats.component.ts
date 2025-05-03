import {AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild} from '@angular/core';
import {LiveSensorUpdate} from "@brado/types";
import {ApexChart, NgApexchartsModule} from 'ng-apexcharts';

@Component({
  selector: 'app-sensor-stats',
  templateUrl: './sensor-stats.component.html',
  styleUrls: ['./sensor-stats.component.scss'],
  imports: [NgApexchartsModule]
})
export class SensorStatsComponent implements OnInit, AfterViewInit {
  private target = 5000;

  @ViewChild('chartContainer', {static: true}) chartContainer!: ElementRef<HTMLDivElement>;

  @Input({required: true}) data!: LiveSensorUpdate;
  @Input({required: true}) sensorID!: string;

  constructor(private hostRef: ElementRef<HTMLElement>) {
  }


  public lineChart: ApexChart = {
    height: 350,
    type: "line",
    animations: {
      enabled: false,
    },
  }

  public lineTooltip: ApexTooltip = {
    shared: true, // Tooltip dla wszystkich serii w tym samym punkcie na osi
    intersect: false,
    // x: {
    //   format: 'dd MMM yyyy HH:mm', // Pokazuje podstawową datę w tooltipie
    //
    // },
    custom: function ({series, seriesIndex, dataPointIndex, w}) {

      const adjustDateToLocalTimezone = (date: Date): Date => {
        const timezoneOffsetInMinutes = date.getTimezoneOffset(); // Różnica w minutach względem UTC
        const adjustedDate = new Date(date);
        adjustedDate.setMinutes(adjustedDate.getMinutes() - timezoneOffsetInMinutes); // Dodajemy różnicę
        return adjustedDate;
      };


      const data = w.globals.seriesX[seriesIndex][dataPointIndex];
      const value = series[seriesIndex][dataPointIndex];
      const date = adjustDateToLocalTimezone(new Date(data));

      return `
      <div style="padding: 5px; background: #fff; color: #333; border: 1px solid #ccc; border-radius: 5px;">
        <div><strong>Date:</strong> ${date.toString()}</div>
        <div><strong>Value:</strong> ${value}</div>
      </div>`;
    }
  };


  public lineXaxis: ApexXAxis = {
    type: 'datetime', // Konfiguracja osi X jako datetime
    labels: {
      datetimeUTC: false, // Opcjonalnie – format daty w lokalnej strefie czasowej
      format: 'HH:mm', // Formatowanie etykiet na osi X (np. "25 Oct 14:30")
    },

    // labels: {
    //   datetimeUTC: false, // Opcjonalnie – format daty w lokalnej strefie czasowej
    //   format: 'dd MMM HH:mm', // Formatowanie etykiet na osi X (np. "25 Oct 14:30")
    // },
    // tooltip: {
    //   formatter: (val) => {
    //     const date = new Date(val);
    //     return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`; // Tooltip dla osi X w lokalnym formacie
    //   },
    // },

  }


  public gaugeFill: ApexFill = {
    colors: ['green']
  }

  public gaugeChart: ApexChart = {
    type: 'radialBar',
    height: 150,
    width: 150
  }

  public gaugePlotOptions: any = {
    radialBar: {
      hollow: {
        size: '70%',
      }
    },
  };

  ngOnInit() {

  }

  ngAfterViewInit() {

    const hostElement = this.hostRef.nativeElement;


    // console.log(this.data.readings.map(r => r.deltaToday))
    setTimeout(() => {
      const width = hostElement.clientWidth;


      console.dir(this.chartContainer.nativeElement)
      // console.log(width)
      // console.dir(hostElement.offsetParent);
      //
      //
      // this.chart.height = this.chartContainer.nativeElement.offsetHeight;
      // this.chart.width = this.chartContainer.nativeElement.offsetHeight;
      // this.gaugeChart.height = 150;
      // this.gaugeChart.width = 150;
      //
      // console.log(this.chart)

    }, 500)
    // this.chart =  {
    //   height: this.chartContainer.nativeElement.offsetHeight,
    //   width: this.chartContainer.nativeElement.offsetHeight,
    //   type: 'radialBar',
    // }
  }

  public get percentage5(): number {
    if (!this.data?.average5) {
      return 0
    }

    return Math.round((this.data?.average5 / (this.target / 60)) * 100)
  }

  public get percentage60(): number {
    if (!this.data?.average60) {
      return 0
    }
    return Math.round((this.data?.average60 / (this.target / 60)) * 100)
  }

  public get chartReadings(): ApexAxisChartSeries {

    return [
      {
        name: `Licznik`,
        data: this.data.readings.map(r => ({x: parseInt(r.timestamp), y: r.deltaToday}))
      }
    ]
  }
}
