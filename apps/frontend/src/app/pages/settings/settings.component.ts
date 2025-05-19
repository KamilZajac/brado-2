import {Component, effect, inject, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import {SettingsService} from "../../services/settings/settings.service";
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [IonHeader, IonToolbar,
    IonTitle,
    IonContent,
    IonList, IonItem, IonLabel, IonInput, FormsModule, AsyncPipe,
    IonButton],
})
export class SettingsComponent {
  hourlyTarget: number = 0; // Wartosc domyślna
  sensorIds: number[] = [1, 2]; // Przykładowe ID (możesz je dostarczyć dynamicznie)
  sensorValues: { [key: number]: string } = {};

  saveSettings() {
    console.log('Hourly Target:', this.hourlyTarget);
    console.log('Sensor Values:', this.sensorValues);

    this.settingsService.saveSettings({
      hourlyTarget: this.hourlyTarget,
      sensorNames: Object.values(this.sensorValues)
    }).subscribe(res => {
      console.log(res);
    })

  }

  constructor(private settingsService: SettingsService) {
    effect(() => {
      const settings = this.settingsService.settings();
      if (settings) {
        this.hourlyTarget = settings.hourlyTarget;
              settings.sensorNames.forEach(((sensor, idx) => {
                this.sensorValues[idx+1] = sensor;
              }))
      }
    });
  }

}
