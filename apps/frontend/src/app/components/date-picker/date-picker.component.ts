import { CommonModule } from '@angular/common';
import { Component, EventEmitter, LOCALE_ID, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonDatetime, IonModal, IonDatetimeButton, IonList, IonItem, IonLabel, IonInput, ModalController} from '@ionic/angular/standalone';
import {CalendarComponentOptions, CalendarModal, CalendarModalOptions, CalendarResult, IonRangeCalendarComponent } from '@googlproxer/ion-range-calendar';

export interface TimeRange {
  from: string,
  to: string,
  color?: string
}

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  providers: [{ provide: LOCALE_ID, useValue: "pl" }],
  imports: [ IonRangeCalendarComponent, CommonModule, FormsModule, IonButton, IonDatetime, IonInput, IonModal, IonDatetimeButton, IonList, IonItem, IonLabel]
})
export class DatePickerComponent  {
  dateRanges: { from: string; to: string; }[] = [];
  type: 'string' = 'string'; // 'string' | 'js-date' | 'time' | 'object'
  optionsRange: CalendarModalOptions = {
    pickMode: 'range',
    weekdays: ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'PT', 'Sob', ],
    weekStart: 1,
    canBackwardsSelected: true

  };

  constructor(public modalCtrl: ModalController) {}

  @Output() rangesChanged = new EventEmitter<TimeRange[]>();


  addRange() {
    this.dateRanges.push(
      { from: '',to: '' }    );
  }

  removeRange(index: number) {
    this.dateRanges.splice(index, 1);
    this.emitChanges();
  }

  emitChanges() {
    console.log(this.dateRanges);

    const formattedRanges = this.dateRanges.map((range): TimeRange => {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);

      const to = new Date(range.to);
      to.setHours(23, 59, 59, 999);

      return {
        from: from.getTime().toString(),
        to: to.getTime().toString(),
        color: ""
      }
    })


    console.log(
      formattedRanges)
    this.rangesChanged.emit(formattedRanges);
  }







}
