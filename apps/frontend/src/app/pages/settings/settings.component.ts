import {Component, OnInit} from '@angular/core';
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

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [IonHeader, IonToolbar,
    IonTitle,
    IonContent,
    IonList, IonItem, IonLabel, IonInput, FormsModule,
    IonButton],

  providers: [SettingsService]
})
export class SettingsComponent implements OnInit {
  hourlyTarget: number = 0; // Wartosc domyślna
  dailyTarget: number = 0; // Wartosc domyślna
  sensorIds: number[] = [1, 2]; // Przykładowe ID (możesz je dostarczyć dynamicznie)
  sensorValues: { [key: number]: string } = {};

  saveSettings() {
    console.log('Hourly Target:', this.hourlyTarget);
    console.log('Daily Target:', this.dailyTarget);
    console.log('Sensor Values:', this.sensorValues);

    this.settingsService.saveSettings({
      hourlyTarget: this.hourlyTarget,
      dailyTarget: this.dailyTarget,
      sensorNames: Object.values(this.sensorValues)
    }).subscribe(res => {
      console.log(res);
    })

    // Możesz tutaj zaimplementować zapis na serwerze lub w pamięci lokalnej
  }

  constructor(private settingsService: SettingsService) {
  }

  public async ngOnInit() {
      this.settingsService.getSettings().subscribe(settings => {
      console.log(settings)
        if(settings) {
          this.dailyTarget = settings.dailyTarget;
          this.hourlyTarget = settings.hourlyTarget;
          settings.sensorNames.forEach(((sensor, idx) => {
            this.sensorValues[idx+1] = sensor;

          }))

          console.log(this.sensorValues)
        };

    })

    this.settingsService.fetchSettings()
  }

}
