import {Component, effect, inject} from '@angular/core';
import {ChartComponent} from "../../components/chart/chart.component";
import {IonCol, IonContent, IonIcon, IonRow} from "@ionic/angular/standalone";
import {DecimalPipe, KeyValuePipe} from "@angular/common";
import {SensorStatsComponent} from "../live/sensor-stats/sensor-stats.component";
import {DataStore} from "../../services/data/data.store";
import {SettingsService} from "../../services/settings/settings.service";
import {TemperatureStore} from "../../services/temperature/temp.store";
import {PieChartComponent} from "../../components/pie-chart/pie-chart.component";
import {addIcons} from "ionicons";
import {
  thermometerOutline
} from "ionicons/icons";
import {ChartWrapperDirective} from "../../directives/chart-wrapper.directive";
import {ActivatedRoute, RouterLink} from "@angular/router";
import {TempCardComponent} from "../temperature/temp-card/temp-card.component";
import {AnnotationsStore} from "../../services/annotation/annotations.store";

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
  imports: [
    IonContent,
    KeyValuePipe,
    SensorStatsComponent,
    IonRow,
    IonCol,
    TempCardComponent,
  ]
})
export class DashboardComponent extends ChartWrapperDirective {
  dataStore = inject(DataStore)
  tempStore = inject(TemperatureStore);

  isAdminPanel = false;

  sensorName = ''
  public hourlyTarget = 0;

  constructor(private settingsService: SettingsService, annotationsStore: AnnotationsStore, private route: ActivatedRoute) {
    super(annotationsStore);

    this.isAdminPanel = this.route.snapshot.data['mode'] === 'admin';

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

  override ngOnInit() {

    super.ngOnInit();

    this.dataStore.loadInitialLiveData();

  }
}
