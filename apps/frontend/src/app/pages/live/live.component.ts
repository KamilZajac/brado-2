import { Component, effect, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IonCard } from '@ionic/angular/standalone';
import {SensorStatsComponent} from "./sensor-stats/sensor-stats.component";
import {Annotation, LiveUpdate} from "@brado/types";
import { KeyValuePipe } from '@angular/common';
import {SocketService} from "../../services/socket/socket.service";
import {DataService, getStartOfToday} from "../../services/data/data.service";
import { signal } from '@angular/core';
import {firstValueFrom} from "rxjs";
import {SettingsService} from "../../services/settings/settings.service";
import {AnnotationService} from "../../services/annotation/annotation.service";

@Component({
  selector: 'app-live',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss'],
  imports: [IonicModule, SensorStatsComponent, KeyValuePipe],

})
export class LiveComponent  implements OnInit {
  liveSensors = signal<LiveUpdate>({});

  public hourlyTarget = 0;
  public sensorNames: { [key: number]: string } = {};
  public groupedAnnotations: { [p: number]: Annotation[] } = {}

  constructor(private socketService: SocketService, private dataService: DataService, private settingsService: SettingsService, private annotationService: AnnotationService ) {
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

  ngOnInit() {
    this.initLiveData();
    this.getAnnotations()

    this.socketService.onLiveUpdate().subscribe(res => {
      this.mergeLiveUpdate(res);
      console.log(res)
    })
  }

  private async initLiveData() {
    const liveData = await firstValueFrom(this.dataService.getInitialLiveData());

    this.liveSensors.update(() => liveData);

      // this.initLiveCharts();
    // this.setTotalProductionPerSensor();
    // this.dataLoaded = true;
  }


  mergeLiveUpdate(newData: LiveUpdate) {
    this.liveSensors.update(current => {
      const updated = { ...current };

      for (const key in newData) {
        if (updated[key]) {
          updated[key] = {
            readings: [...updated[key].readings, ...newData[key].readings],
            average5: newData[key].average5,
            average60: newData[key].average60
          };
        } else {
          // new sensor data
          updated[key] = newData[key];
        }
      }

      console.log(updated)
      return updated;
    });
  }

  getSensorName(key: string) {
    return this.sensorNames[+key] || 'Sensor ' + key;
  }

  private async getAnnotations() {
    const annotations = await firstValueFrom(this.annotationService.getAnnotationsAfter(getStartOfToday()))
    const grouped: {[key: number]: Annotation[]} = {};

    annotations.forEach(annotation => {
      grouped[annotation.sensorId] = [...(grouped[annotation.sensorId] || []), annotation]
    })

    this.groupedAnnotations = grouped
    console.log(this.groupedAnnotations)
  }
}
