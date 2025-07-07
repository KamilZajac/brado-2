import {Component, inject} from '@angular/core';
import {TemperatureStore} from "../../services/temperature/temp.store";
import {IonCol, IonContent,IonRow} from "@ionic/angular/standalone";
import {KeyValuePipe} from "@angular/common";
import {TempCardComponent} from "./temp-card/temp-card.component";


@Component({
  selector: 'app-temperature',
  templateUrl: './temperature.component.html',
  styleUrls: ['./temperature.component.scss'],
  imports: [
    IonContent,
    IonRow,
    KeyValuePipe,
    IonCol,
    TempCardComponent,

  ]
})
export class TemperatureComponent {
  tempStore = inject(TemperatureStore);
}
