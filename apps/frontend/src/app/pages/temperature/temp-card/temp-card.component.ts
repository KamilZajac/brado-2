import {Component, Input} from '@angular/core';
import {IonIcon, NavController} from "@ionic/angular/standalone";
import {addIcons} from "ionicons";
import {thermometerOutline} from "ionicons/icons";
import {Router, RouterLink} from "@angular/router";
import {DecimalPipe} from "@angular/common";

@Component({
  selector: 'app-temp-card',
  templateUrl: './temp-card.component.html',
  styleUrls: ['./temp-card.component.scss'],
  imports: [
    IonIcon,
    DecimalPipe,
    RouterLink
  ]
})
export class TempCardComponent   {
  @Input() name?: string
  @Input() temp?: number



  constructor(
  ) {
    addIcons({
      thermometerOutline
    });
  }



  public get showWarning(){
     return this.name?.toLowerCase().includes('szok') && this.temp && this.temp >= -15;
  }
}
