import {Component, inject, OnInit} from '@angular/core';
import {TemperatureStore} from "../../services/temperature/temp.store";
import {ChartComponent} from "../../components/chart/chart.component";
import {IonContent, IonRow} from "@ionic/angular/standalone";
import {KeyValuePipe} from "@angular/common";

@Component({
  selector: 'app-temperature',
  templateUrl: './temperature.component.html',
  styleUrls: ['./temperature.component.scss'],
  imports: [
    ChartComponent,
    IonContent,
    IonRow,
    KeyValuePipe
  ]
})
export class TemperatureComponent  implements OnInit {

  tempStore = inject(TemperatureStore);
  constructor() { }

  ngOnInit() {
    // this.tempStore.loadAll();
  }

}
