import {Component, effect, inject, OnInit} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IonCard } from '@ionic/angular/standalone';
import {SensorStatsComponent} from "./sensor-stats/sensor-stats.component";
import {Annotation, LiveUpdate, WorkingPeriod} from "@brado/types";
import { KeyValuePipe } from '@angular/common';
import {SocketService} from "../../services/socket/socket.service";
import {DataService, getStartOfToday, getWeeklyTimestamps} from "../../services/data/data.service";
import { signal } from '@angular/core';
import {firstValueFrom} from "rxjs";
import {SettingsService} from "../../services/settings/settings.service";
import {AnnotationService} from "../../services/annotation/annotation.service";
import {ChartWrapperDirective} from "../../directives/chart-wrapper.directive";
import {UsersStore} from "../../services/users/users.store";
import {DataStore} from "../../services/data/data.store";
import {AnnotationsStore} from "../../services/annotation/annotations.store";
import {ReadingsTableComponent} from "../../components/readings-table/readings-table.component";

@Component({
  selector: 'app-live',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss'],
  imports: [IonicModule, SensorStatsComponent, KeyValuePipe, ReadingsTableComponent],

})
export class LiveComponent extends ChartWrapperDirective implements OnInit {
  dataStore = inject(DataStore)

  displayMode: 'chart' | 'table' = 'chart';

  public hourlyTarget = 0;
  public sensorNames: { [key: number]: string } = {};

  public dailyWorkingStats  = this.dataStore.statsForCurrentPeriod

  constructor(
    private dataService: DataService,
    private settingsService: SettingsService, annotationStore: AnnotationsStore ) {
    super(annotationStore)
    effect(() => {
      const settings = this.settingsService.settings();
      if (settings) {
        this.hourlyTarget = settings.hourlyTarget;
        settings.sensorNames.forEach(((sensor, idx) => {
          this.sensorNames[idx+1] = sensor;
        }))
      }
    });
  }

  override ngOnInit() {
    super.ngOnInit()
    this.dataStore.loadInitialLiveData();
  }

  getSensorName(key: string) {
    return this.sensorNames[+key] || 'Sensor ' + key;
  }


  exportDataToExcel() {
    //
    // this.dataService.exportLiveData().subscribe((blob) => {
    //   const url = window.URL.createObjectURL(blob);
    //   const a = document.createElement('a');
    //   a.href = url;
    //   a.download = 'report.xlsx';
    //   a.click();
    //   window.URL.revokeObjectURL(url);
    // });
  }

}
