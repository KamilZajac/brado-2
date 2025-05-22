import { CommonModule } from '@angular/common';
import { Component, EventEmitter, LOCALE_ID, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonDatetime, IonModal, IonDatetimeButton, IonList, IonItem, IonLabel, IonInput, ModalController, IonCol, IonRow, IonGrid, IonContent, IonIcon, IonAlert, AlertController} from '@ionic/angular/standalone';
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
  imports: [ IonRangeCalendarComponent, IonAlert, CommonModule, FormsModule,IonIcon, IonCol , IonContent, IonGrid ,IonRow,  IonButton, IonDatetime, IonInput, IonModal, IonDatetimeButton, IonList, IonItem, IonLabel]
})
export class DatePickerComponent  {
  dateRanges: { from: string; to: string; }[] = [];
  type: 'string' = 'string'; // 'string' | 'js-date' | 'time' | 'object'
  optionsRange: any = {
    pickMode: 'range',
    weekdays: ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'PT', 'Sob', ],
    weekStart: 1,
    canBackwardsSelected: true,
    monthPickerFormat: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'],
    months: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru']
  };

  constructor(public alertController: AlertController) {}

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

    const areRangesValid = this.areRangesConsistent(formattedRanges)

    if(!areRangesValid) {
      this.displayValidationError()
    } else {
      this.rangesChanged.emit(formattedRanges);
    }
  }


  async displayValidationError() {
    const alert = await this.alertController.create({
      header: 'Błąd walidacji',
      message: 'Wybrane zakresy dat są nieprawidłowe. Upewnij się, że:  Wszystkie zakresy mają tę samą długość, zaczynają się w tym samym dniu tygodnia oraz nie są zduplikowane',

      buttons: ['OK']
    });
    await alert.present();
  }

  areRangesConsistent(ranges: TimeRange[]): boolean {
    if (ranges.length < 2) return true;

    const getDayCount = (from: number, to: number) => {
      const msInDay = 1000 * 60 * 60 * 24;
      return Math.round((to - from) / msInDay) + 1;
    };

    const getStartWeekday = (timestamp: number) => {
      return new Date(timestamp).getDay();
    };

    const serializeRange = (range: TimeRange) => {
      return `${range.from}-${range.to}`;
    };

    const first = ranges[0];
    const expectedDayCount = getDayCount(+first.from, +first.to);
    const expectedStartWeekday = getStartWeekday(+first.from);

    const seen = new Set<string>();

    for (const range of ranges) {
      const dayCount = getDayCount(+range.from, +range.to);
      const startWeekday = getStartWeekday(+range.from);
      const key = serializeRange(range);

      if (dayCount !== expectedDayCount || startWeekday !== expectedStartWeekday) {
        return false;
      }

      if (seen.has(key)) {
        return false; // duplicate range
      }

      seen.add(key);
    }

    return true;
  }

}
