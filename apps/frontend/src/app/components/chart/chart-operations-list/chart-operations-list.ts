import {Component, Input} from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import {IonItem, IonList} from "@ionic/angular/standalone";

export enum ChartOperation {
  DEFAULT,
  ADD_ANNOTATION,
  REMOVE_ANNOTATION,
  ADD_EDIT_POINTS,
  REMOVE_POINTS,
  BULK_DELETE_POINTS,
  RANGE_SELECT_POINTS,
  EXPORT_RAW,
  IMPORT_RAW,
}

@Component({
  selector: 'app-operation-list',
  imports: [CommonModule, IonList, IonItem],
  template: `
    {{isLive}}
    <ion-list>
      <ion-item button (click)="select(ChartOperation.ADD_ANNOTATION)">Dodaj Adnotacje</ion-item>
      <ion-item button (click)="select(ChartOperation.EXPORT_RAW)">Exportuj surowe odczyty</ion-item>
      <ion-item button (click)="select(ChartOperation.IMPORT_RAW)">Importuj surowe odczyty</ion-item>
    </ion-list>
  `
})
export class ChartOperationsListComponent {
  @Input() isLive = false

  constructor(private popoverCtrl: PopoverController) {

  }

  select(operation: ChartOperation) {
    this.popoverCtrl.dismiss({ operation }); // return data to parent
  }

  protected readonly ChartOperation = ChartOperation;
}
