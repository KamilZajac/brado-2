import {Component, effect, inject, OnInit} from '@angular/core';
import {ChartComponent} from "../../components/chart/chart.component";
import {DatePickerComponent} from "../../components/date-picker/date-picker.component";
import {IonCol, IonContent, IonIcon, IonRow} from "@ionic/angular/standalone";
import {KeyValuePipe} from "@angular/common";
import {SensorStatsComponent} from "../live/sensor-stats/sensor-stats.component";
import {DataStore} from "../../services/data/data.store";
import {SettingsService} from "../../services/settings/settings.service";
import {TemperatureStore} from "../../services/temperature/temp.store";
import {PieChartComponent} from "../../components/pie-chart/pie-chart.component";
import {addIcons} from "ionicons";
import {
  calendarOutline,
  gitCompareOutline,
  personOutline,
  pulseOutline,
  settingsOutline,
  thermometerOutline
} from "ionicons/icons";
import {ChartWrapperDirective} from "../../directives/chart-wrapper.directive";
import {AnnotationService} from "../../services/annotation/annotation.service";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
  imports: [
    IonContent,
    KeyValuePipe,
    SensorStatsComponent,
    ChartComponent,
    PieChartComponent,
    IonIcon,
    IonRow,
    IonCol,
  ]
})
export class DashboardComponent extends ChartWrapperDirective {
  dataStore = inject(DataStore)
  tempStore = inject(TemperatureStore);

  sensorName = ''
  public hourlyTarget = 0;

  constructor(private settingsService: SettingsService, annotationService: AnnotationService) {
    super(annotationService);

    effect(() => {
      const settings = this.settingsService.settings();
      if (settings) {
        this.hourlyTarget = settings.hourlyTarget;

        this.sensorName = settings.sensorNames[1]

      }
    });
    addIcons({
      thermometerOutline
    });
  }


}
