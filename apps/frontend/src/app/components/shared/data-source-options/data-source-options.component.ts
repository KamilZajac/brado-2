import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-source-options',
  templateUrl: './data-source-options.component.html',
  styleUrls: ['./data-source-options.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class DataSourceOptionsComponent {
  @Input() dataSourceType: 'current-period' | 'last-days' = 'current-period';
  @Input() selectedDays: number = 7;
  @Input() daysOptions: number[] = [1, 3, 7, 14, 30];

  @Output() dataSourceTypeChange = new EventEmitter<'current-period' | 'last-days'>();
  @Output() selectedDaysChange = new EventEmitter<number>();

  /**
   * Changes the data source type and emits an event
   * @param type The new data source type
   */
  changeDataSourceType(type: 'current-period' | 'last-days'): void {
    this.dataSourceType = type;
    this.dataSourceTypeChange.emit(type);
  }

  /**
   * Changes the number of days to show data for and emits an event
   * @param event The change event from the select element
   */
  changeSelectedDays(event: any): void {
    const days = event.target.value;
    this.selectedDays = days;
    this.selectedDaysChange.emit(days);
  }
}
