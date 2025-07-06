import { Component } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {IonItem, IonList} from "@ionic/angular/standalone";

export enum ChartOperation {
  DEFAULT,
  ADD_ANNOTATION,
  REMOVE_ANNOTATION,
  ADD_EDIT_POINTS,
  REMOVE_POINTS,

}

@Component({
  selector: 'app-operation-list',
  imports: [CommonModule, IonList, IonItem],
  template: `
    <ion-list>
      <ion-item button (click)="select(ChartOperation.ADD_ANNOTATION)">Dodaj Adnotacje</ion-item>
      <ion-item button (click)="select(ChartOperation.ADD_EDIT_POINTS)">Dodaj/Edytuj odczyt</ion-item>
    </ion-list>
  `
})
export class ChartOperationsListComponent {
  constructor(private popoverCtrl: PopoverController) {}

  select(operation: ChartOperation) {
    this.popoverCtrl.dismiss({ operation }); // return data to parent
  }

  protected readonly ChartOperation = ChartOperation;
}
