import { Component, Input, OnInit } from '@angular/core';
import {HourlyReading, LiveReading} from "@brado/types";

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
  imports: []
})
export class LineChartComponent  implements OnInit {
  @Input() data: HourlyReading[] = [];


  constructor() { }

  ngOnInit() {}




}
