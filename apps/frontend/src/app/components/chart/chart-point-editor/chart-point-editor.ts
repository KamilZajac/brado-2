import {FormsModule} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {
  IonButton,
  IonButtons, IonContent,
  IonHeader, IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonTitle,
  IonToolbar,
  ModalController
} from "@ionic/angular/standalone";
import {Component, Input, OnInit} from "@angular/core";
import {LiveReading} from "@brado/types";

@Component({
  standalone: true,
  selector: 'app-point-editor',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Edit Value</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if(reading) {
      <ion-item>
        <ion-label position="stacked">Czas</ion-label>
        <ion-text>{{ reading?.timestamp | date: 'dd/MM/yyyy HH:mm:ss' }}</ion-text>
      </ion-item>
        <ion-item>
          <ion-label position="stacked">Stan licznika</ion-label>
          <ion-input [(ngModel)]="reading.value" type="number"></ion-input>
        </ion-item>
      }

      <ion-button expand="block" (click)="save()">Save</ion-button>

    </ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonInput, IonItem, IonLabel, IonText, CommonModule, FormsModule]
})
export class PointEditorComponent implements OnInit {
  @Input() timestamp!: string;
  @Input() sensorId!: number;
  @Input() reading: LiveReading | null = null;

  constructor(private modalCtrl: ModalController) {}

  public ngOnInit() {

    if(!this.reading) {
      this.reading = {
        id: -1,
        sensorId: this.sensorId,
        timestamp: parseInt(this.timestamp).toString(),
        value: 0,
        delta: 0,
      }
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  save() {
    this.modalCtrl.dismiss(this.reading);
  }
}
