import {Component, OnInit, WritableSignal, ViewChildren, inject, effect} from '@angular/core';
import {SocketService} from "../../services/socket/socket.service";
import {firstValueFrom, Observable, Subject} from "rxjs";
import {DataService, getWeeklyTimestamps} from "../../services/data/data.service";

import {KeyValuePipe} from "@angular/common";
import {signal} from '@angular/core';
import {Annotation, HourlyReading} from "@brado/types";
import {LineChartComponent} from "../../components/line-chart/line-chart.component";
import {ReadingsToSeriesMultiplePipe} from "../../misc/readings-to-series-multiple.pipe";
import {ChartComponent} from "../../components/chart/chart.component";
import {ReadingsToSeriesPipe} from "../../misc/readings-to-series.pipe";
import {IonContent, IonRow} from '@ionic/angular/standalone';
import {AnnotationService} from "../../services/annotation/annotation.service";
import {ChartWrapperDirective} from "../../directives/chart-wrapper.directive";
import {DataStore} from "../../services/data/data.store";
import {SettingsService} from "../../services/settings/settings.service";
import {settings} from "ionicons/icons";
import {WorkingStatsComponent} from "../../components/working-stats/working-stats.component";


@Component({
  selector: 'app-weekly',
  templateUrl: './weekly.component.html',
  styleUrls: ['./weekly.component.scss'],
  providers: [DataService],
  imports: [KeyValuePipe, IonContent, ChartComponent, IonRow, WorkingStatsComponent]
})
export class WeeklyComponent extends ChartWrapperDirective implements OnInit {
  override mode: 'weekly' | 'live' = 'weekly';
  public hourlyTarget = 5250
  dataStore = inject(DataStore)
  public sensorNames: { [key: number]: string } = {};


  constructor(private dataService: DataService, private settingsService: SettingsService, annotationService: AnnotationService) {
    super(annotationService)

    effect(() => {
      const settings = this.settingsService.settings();
      if (settings) {
        this.hourlyTarget = settings.hourlyTarget;
        settings.sensorNames.forEach(((sensor, idx) => {
          this.sensorNames[idx + 1] = sensor;
        }))
      }
    });
  }

  public override ngOnInit(): void {
    super.ngOnInit();
    this.dataStore.loadWeeklyData()
  }


  exportDataToExcel() {
    const {from, to} = getWeeklyTimestamps()

    this.dataService.exportData(from, to).subscribe((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }
}
