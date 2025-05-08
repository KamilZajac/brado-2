import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { IonCard } from '@ionic/angular/standalone';
import {SensorStatsComponent} from "./sensor-stats/sensor-stats.component";
import {LiveUpdate} from "@brado/types";
import { KeyValuePipe } from '@angular/common';
import {SocketService} from "../../services/socket/socket.service";
import {DataService} from "../../services/data/data.service";
import { signal } from '@angular/core';
import {firstValueFrom} from "rxjs";

@Component({
  selector: 'app-live',
  templateUrl: './live.component.html',
  styleUrls: ['./live.component.scss'],
  imports: [IonicModule, SensorStatsComponent, KeyValuePipe],

})
export class LiveComponent  implements OnInit {
  liveSensors = signal<LiveUpdate>({});


  constructor(private socketService: SocketService, private dataService: DataService ) {


  }

  ngOnInit() {
    this.initLiveData();

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

}
