import {Component, inject} from '@angular/core';
import {TemperatureStore} from "../../services/temperature/temp.store";
import {IonCol, IonContent,IonRow} from "@ionic/angular/standalone";
import {KeyValuePipe} from "@angular/common";
import {TempCardComponent} from "./temp-card/temp-card.component";
import {TempService} from "../../services/temperature/temp.service";


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

  constructor(private tempService: TempService) {
  }

  exportTempToExcel() {

    this.tempService.exportAllToExcel().subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export temperatur.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
