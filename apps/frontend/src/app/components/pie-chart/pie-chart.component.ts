import { Component, Input, OnInit } from '@angular/core';

import {BarController, BarElement, CategoryScale, ChartData, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
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
  LineOptions,
  DoughnutController,
  ArcElement,
} from 'chart.js';

import 'chartjs-adapter-date-fns';
import { DecimalPipe } from '@angular/common';

ChartJS.register(
  DoughnutController,
  ArcElement
);

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss'],
  imports: [BaseChartDirective, DecimalPipe],
})
export class PieChartComponent implements OnInit {
  @Input() value: number = 0;
  @Input() target: number = 0;
  @Input() disableAnimation = false

  chartOptions = {};

  public ngOnInit() {
    this.chartOptions = {
      cutout: 50,
      responsive: true,
      animation: {
        duration: this.disableAnimation ? 0 : 2000,
      },
    }
  }

  public get chartData(): ChartData<'doughnut'> {
    const getColor = (): string => {
      const diff = Math.abs(this.value - this.target);
      const percentage = diff / this.target;
      const normalizedPercentage = Math.min(percentage, 1);

      const red = Math.round(255 * normalizedPercentage);
      const green = Math.round(255 * (1 - normalizedPercentage));
      return `rgb(${red}, ${green}, 0)`;
    }
    const percentage = Math.min(this.value, this.target) / this.target;
    const remaining = 1 - percentage;

    return {
      datasets: [{
        data: [percentage * 100, remaining * 100],
        backgroundColor: [
          getColor(),
          'rgb(255,255,255)'
        ],
        hoverOffset: 4
      }]
    };
  };

  constructor() { }



}
