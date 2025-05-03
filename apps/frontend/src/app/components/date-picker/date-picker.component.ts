import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IonButton, IonDatetime, IonModal, IonDatetimeButton} from '@ionic/angular/standalone';

export interface TimeRange {
  from: string,
  to: string,
  color?: string
}

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  imports: [IonicModule, CommonModule, FormsModule, IonButton, IonDatetime, IonModal, IonDatetimeButton]
})
export class DatePickerComponent  {

  @Output() rangesChanged = new EventEmitter<TimeRange[]>();

  // Todo fix typing here - no null
  ranges: TimeRange[] = [

  ];

  addRange() {
    this.ranges.push({ from: new Date().toISOString(), to: new Date().toISOString(), color: '#0000ff' });
  }

  removeRange(index: number) {
    this.ranges.splice(index, 1);
    this.emitChanges();
  }

  emitChanges() {
    console.log(this.ranges);

    const formattedRanges = this.ranges.map((range): TimeRange => {
      const from = new Date(range.from);
      from.setHours(0, 0, 0, 0);

      const to = new Date(range.to);
      to.setHours(23, 59, 59, 999);

      return {
        from: from.getTime().toString(),
        to: to.getTime().toString(),
        color: range.color}
    })

    this.rangesChanged.emit(formattedRanges);
  }

}
