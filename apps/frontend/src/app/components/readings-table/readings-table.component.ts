import { Component, effect, EventEmitter, inject, input, Input, OnInit, Output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataSourceOptionsComponent } from '../shared/data-source-options/data-source-options.component';
import {
  AlertController,
  ActionSheetController,
  ToastController,
  ModalController,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonInput,
  IonLabel,
  IonCheckbox,
  IonRow
} from '@ionic/angular/standalone';
import { HourlyReading, LiveReading, AnnotationType, User, Annotation } from "@brado/types";
import { DataService } from "../../services/data/data.service";
import { DataStore } from "../../services/data/data.store";
import { AnnotationsStore } from "../../services/annotation/annotations.store";
import { TextInputModalComponent } from "../text-input-modal/text-input-modal.component";
import { addIcons } from "ionicons";
import { bookmarkOutline, checkmarkOutline, closeOutline, createOutline } from "ionicons/icons";
import { SettingsService } from 'src/app/services/settings/settings.service';

interface ReadingsByDay {
  date: string;
  readings: (LiveReading | HourlyReading)[];
  expanded: boolean;
}

@Component({
  selector: 'app-readings-table',
  templateUrl: './readings-table.component.html',
  styleUrls: ['./readings-table.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonInput,
    IonLabel,
    IonCheckbox,
    IonRow,
    DataSourceOptionsComponent
  ]
})
export class ReadingsTableComponent implements OnInit {
  dataStore = inject(DataStore);
  annotationsStore = inject(AnnotationsStore);

  @Input() data: HourlyReading[] | LiveReading[] = [];
  @Input() isLive = false;
  @Input() hourlyTarget = 0;
  @Input() sensorNames: { [key: number]: string } = {};
  @Input() sensorName = "";

  readingsByDay: ReadingsByDay[] = [];
  selectedReadings: (LiveReading | HourlyReading)[] = [];
  lastSelectedReading: LiveReading | HourlyReading | null = null;
  editingReading: LiveReading | HourlyReading | null = null;
  newReading: Partial<LiveReading> | null = null;

  // Data selection properties
  dataSourceType: 'current-period' | 'last-days' = 'current-period';
  selectedDays: number = 7; // Default to 7 days
  daysOptions: number[] = [1, 3, 7, 14, 30];
  @Input() sensorId!: string;

  constructor(
    private alertController: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private dataService: DataService,
    private settings: SettingsService,
  ) {
    addIcons({
      closeOutline,checkmarkOutline, createOutline, bookmarkOutline
    })
    effect(() => {
      if (this.annotationsStore.getAnnotationsForReadings(this.data)?.length) {
        this.groupReadingsByDay();
      }
    });
  }

  ngOnInit() {
    this.groupReadingsByDay();
  }

  ngOnChanges() {
    this.groupReadingsByDay();
  }

  /**
   * Changes the data source type and updates the table
   * @param type The new data source type
   */
  changeDataSourceType(type: 'current-period' | 'last-days') {
    this.dataSourceType = type;
    this.loadDataForSelectedPeriod();
  }

  /**
   * Changes the number of days to show data for and updates the table
   * @param days The number of days to show data for
   */
  changeSelectedDays(days: number | any) {
    // Handle both direct number input from shared component and event from select element
    console.log(days)

    this.selectedDays = days;

    if (this.dataSourceType === 'last-days') {
      this.loadDataForSelectedPeriod();
    }
  }

  /**
   * Loads data for the selected time period
   */
  loadDataForSelectedPeriod() {
    if (this.dataSourceType === 'current-period') {
      // Use the current data, which should be for the current work period
      // No need to fetch new data
      if (this.isLive && this.sensorName) {
        const sensorId = this.data.length > 0 ? this.data[0].sensorId : null;
        if (sensorId) {
          this.data = this.dataStore.liveData()[sensorId].readings;
          this.groupReadingsByDay();
        }
      }
    } else if (this.dataSourceType === 'last-days') {
      // Calculate the timestamp for X days ago
      const now = new Date();
      const daysAgo = new Date();
      daysAgo.setDate(now.getDate() - this.selectedDays);
      daysAgo.setHours(0, 0, 0, 0);

      console.log(this.data)
      console.log(this.isLive)
      // Fetch data for the last X days
      if (this.isLive ) {
        const sensorId = this.sensorId;
        this.dataService.getDataAfterTimestamp(daysAgo.getTime()).subscribe(readings => {
          // Filter readings for the current sensor
          const filteredReadings = readings.filter(r => this.sensorId === sensorId);
          this.data = filteredReadings;

          this.groupReadingsByDay();
        });
      }
    }
  }

  /**
   * Groups readings by day
   */
  groupReadingsByDay() {
    if (!this.data || this.data.length === 0) {
      this.readingsByDay = [];
      return;
    }

    // Sort readings by timestamp
    const sortedReadings = [...this.data].sort((a, b) => +a.timestamp - +b.timestamp);

    // Group by day
    const groupedByDay = sortedReadings.reduce((acc, reading) => {
      const date = new Date(+reading.timestamp);
      const dateString = date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }); // DD.MM.YYYY format

      if (!acc[dateString]) {
        acc[dateString] = [];
      }

      acc[dateString].push(reading);

      return acc;
    }, {} as { [key: string]: (LiveReading | HourlyReading)[] });


    // Convert to array format for template
    this.readingsByDay = Object.keys(groupedByDay).map(date => ({
      date,
      readings: groupedByDay[date],
      expanded: false
    })).sort((a, b) => b.date.localeCompare(a.date)); // Sort by date descending (newest first)
  }

  /**
   * Toggles the expanded state of a day group
   */
  toggleDayGroup(group: ReadingsByDay) {
    group.expanded = !group.expanded;
  }

  /**
   * Checks if a reading is selected
   */
  isReadingSelected(reading: LiveReading | HourlyReading): boolean {
    return this.selectedReadings.includes(reading);
  }

  /**
   * Toggles selection of a reading
   * @param reading The reading to toggle selection for
   * @param event The mouse event, used to check if shift key is pressed
   */
  toggleReadingSelection(reading: LiveReading | HourlyReading, event?: MouseEvent) {
    const index = this.selectedReadings.findIndex(r => r === reading);

    // If shift key is pressed and we have a last selected reading
    if (event?.shiftKey && this.lastSelectedReading && this.lastSelectedReading !== reading) {
      this.selectReadingsBetween(this.lastSelectedReading, reading);
    } else {
      // Regular toggle behavior
      if (index === -1) {
        this.selectedReadings.push(reading);
      } else {
        this.selectedReadings.splice(index, 1);
      }

      // Update last selected reading
      this.lastSelectedReading = index === -1 ? reading : null;
    }
  }

  /**
   * Selects all readings between two readings (inclusive)
   * @param reading1 First reading
   * @param reading2 Second reading
   */
  private selectReadingsBetween(reading1: LiveReading | HourlyReading, reading2: LiveReading | HourlyReading) {
    // Find all readings in the same day group
    for (const dayGroup of this.readingsByDay) {
      if (!dayGroup.expanded) continue; // Skip collapsed day groups

      const readings = dayGroup.readings;
      const index1 = readings.findIndex(r => r === reading1);
      const index2 = readings.findIndex(r => r === reading2);

      // If both readings are in this day group
      if (index1 !== -1 && index2 !== -1) {
        // Determine start and end indices
        const startIndex = Math.min(index1, index2);
        const endIndex = Math.max(index1, index2);

        // Select all readings in the range
        for (let i = startIndex; i <= endIndex; i++) {
          const reading = readings[i];
          if (!this.isReadingSelected(reading)) {
            this.selectedReadings.push(reading);
          }
        }

        // Update last selected reading
        this.lastSelectedReading = reading2;
        return;
      }
    }
  }

  /**
   * Handles checkbox click event to capture shift key state
   * @param reading The reading associated with the checkbox
   * @param event The mouse event from the click
   */
  handleCheckboxClick(reading: LiveReading | HourlyReading, event?: MouseEvent) {
    // Prevent default to avoid the checkbox from toggling automatically
    // We'll handle the toggling in toggleReadingSelection
    event?.preventDefault();

    // Call toggleReadingSelection with the reading and the event (which contains shiftKey)
    this.toggleReadingSelection(reading, event);
  }

  /**
   * Toggles selection of all readings in a day group
   */
  toggleAllReadingsInDay(dayGroup: ReadingsByDay) {
    const allSelected = dayGroup.readings.every(r => this.isReadingSelected(r));

    if (allSelected) {
      // Deselect all readings in this day group
      dayGroup.readings.forEach(reading => {
        const index = this.selectedReadings.findIndex(r => r === reading);
        if (index !== -1) {
          this.selectedReadings.splice(index, 1);
        }
      });
    } else {
      // Select all readings in this day group
      dayGroup.readings.forEach(reading => {
        if (!this.isReadingSelected(reading)) {
          this.selectedReadings.push(reading);
        }
      });
    }

    // Update last selected reading
    this.lastSelectedReading = allSelected ? null : dayGroup.readings[dayGroup.readings.length - 1];
  }

  /**
   * Checks if all readings in a day group are selected
   */
  areAllReadingsInDaySelected(dayGroup: ReadingsByDay): boolean {
    return dayGroup.readings.length > 0 && dayGroup.readings.every(r => this.isReadingSelected(r));
  }

  /**
   * Checks if some readings in a day group are selected
   */
  areSomeReadingsInDaySelected(dayGroup: ReadingsByDay): boolean {
    return dayGroup.readings.some(r => this.isReadingSelected(r)) && !this.areAllReadingsInDaySelected(dayGroup);
  }

  /**
   * Deletes selected readings after confirmation
   */
  async deleteSelectedReadings() {
    if (this.selectedReadings.length === 0) {
      await this.showToast('No readings selected');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm Deletion',
      message: `Are you sure you want to delete ${this.selectedReadings.length} selected readings?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: async () => {
            try {
              console.log('delete')
              console.log(this.selectedReadings)
              // For LiveReadings with _id property
              const readingIds = this.selectedReadings
                .map(reading => (reading as any).id);


              if (readingIds.length > 0) {
                await this.dataStore.deleteReadings(readingIds);
                // Todo delete
                await this.showToast(`Deleted ${readingIds.length} readings`);
              }

              this.selectedReadings = [];
              this.groupReadingsByDay();
            } catch (error) {
              console.error('Error deleting readings:', error);
              await this.showToast('Error deleting readings');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Starts editing a reading
   */
  editReading(reading: LiveReading | HourlyReading) {
    this.editingReading = { ...reading };
  }

  /**
   * Saves the edited reading
   */
  async saveEditedReading() {
    if (!this.editingReading) return;

    try {
      if ('_id' in this.editingReading) {
        await this.dataStore.createUpdateLiveReading(this.editingReading as LiveReading);
        await this.showToast('Reading updated successfully');
      }
      this.editingReading = null;
      this.groupReadingsByDay();
    } catch (error) {
      console.error('Error updating reading:', error);
      await this.showToast('Error updating reading');
    }
  }

  /**
   * Cancels editing a reading
   */
  cancelEditing() {
    this.editingReading = null;
  }

  /**
   * Starts adding a new reading
   */
  addNewReading() {
    const now = new Date();
    const sensorId = this.data.length > 0 ? this.data[0].sensorId : 1;

    this.newReading = {
      timestamp: now.getTime().toString(),
      value: 0,
      delta: 0,
      sensorId: sensorId,
      dailyTotal: 0
    };
  }

  /**
   * Saves the new reading
   */
  async saveNewReading() {
    if (!this.newReading) return;

    console.log(this.newReading)
    if(this.newReading.timestamp) {
      this.newReading.timestamp = new Date(this.newReading.timestamp).getTime().toString();
    }

    console.log(this.newReading)
    try {
      await this.dataStore.createUpdateLiveReading(this.newReading as LiveReading);
      await this.showToast('Reading added successfully');
      this.newReading = null;
      this.groupReadingsByDay();
    } catch (error) {
      console.error('Error adding reading:', error);
      await this.showToast('Error adding reading');
    }
  }

  /**
   * Cancels adding a new reading
   */
  cancelAddingReading() {
    this.newReading = null;
  }

  /**
   * Shows a toast message
   */
  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000
    });
    await toast.present();
  }

  /**
   * Gets the sensor name for a reading
   */
  getSensorName(sensorId: number): string {
    return this.sensorNames[sensorId] || `Sensor ${sensorId}`;
  }

  /**
   * Formats a timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    return new Date(+timestamp).toLocaleString();
  }

  /**
   * Formats a timestamp for datetime-local input
   */
  formatDateTimeForInput(timestamp: string | undefined): string {
    if(!timestamp) {
      return ''
    }

    return timestamp
  }

  /**
   * Presents annotation options for a reading
   */
  async presentAnnotationOptions(reading: LiveReading | HourlyReading) {
    const newAnnotation: Partial<Annotation> = {
      from_timestamp: reading.timestamp,
      to_timestamp: reading.timestamp,
      sensorId: reading.sensorId,
      text: "",
      type: AnnotationType.BREAK_FROM_TO
    };

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Annotation Type',
      buttons: [
        {
          text: 'Break',
          handler: () => {
            newAnnotation.type = AnnotationType.BREAK_FROM_TO;
            this.openNewAnnotationModal(newAnnotation);
          }
        },
        {
          text: 'Accident',
          handler: () => {
            newAnnotation.type = AnnotationType.ACCIDENT_FROM_TO;
            this.openNewAnnotationModal(newAnnotation);
          }
        },
        {
          text: 'Clips Change',
          handler: () => {
            newAnnotation.type = AnnotationType.CLIPS_CHANGE;
            this.openNewAnnotationModal(newAnnotation);
          }
        },
        {
          text: 'Organization',
          handler: () => {
            newAnnotation.type = AnnotationType.ORGANISATION_FROM_TO;
            this.openNewAnnotationModal(newAnnotation);
          }
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Opens a modal for entering annotation text
   */
  async openNewAnnotationModal(annotation: Partial<Annotation>) {
    const modal = await this.modalCtrl.create({
      component: TextInputModalComponent,
      componentProps: {
        message: `Enter annotation text (optional):`
      }
    });

    await modal.present();

    const { data, role } = await modal.onDidDismiss();

    if (role === 'confirm') {
      const newAnnotation: Partial<Annotation> = {
        ...annotation,
        text: data,
      };

      this.annotationsStore.createAnnotation(newAnnotation);
      await this.showToast('Annotation added');
    }
  }
}
