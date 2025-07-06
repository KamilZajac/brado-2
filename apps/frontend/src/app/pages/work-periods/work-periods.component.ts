import { Component, OnInit } from '@angular/core';
import {DataStore} from "../../services/data/data.store";
import {DatePipe, KeyValuePipe} from "@angular/common";
import {IonCol, IonRow} from "@ionic/angular/standalone";

@Component({
  selector: 'app-work-periods',
  templateUrl: './work-periods.component.html',
  styleUrls: ['./work-periods.component.scss'],
  imports: [
    KeyValuePipe, IonRow, IonCol, DatePipe
  ]
})
export class WorkPeriodsComponent  implements OnInit {

  constructor(public dataStore: DataStore) { }

  ngOnInit() {
    this.dataStore.loadWorkingPeriods()
  }

}
