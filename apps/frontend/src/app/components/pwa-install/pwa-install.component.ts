import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import { Subscription } from 'rxjs';
import { PwaInstallService } from '../../services/pwa/pwa-install.service';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  template: `
    <ion-button (click)="installPwa()" color="primary">
      <ion-icon name="download-outline" slot="start"></ion-icon>
      Install App
    </ion-button>
  `,
  styles: []
})
export class PwaInstallComponent implements OnInit, OnDestroy {
  showInstallButton = false;
  private subscription: Subscription | null = null;

  private pwaInstallService = inject(PwaInstallService);

  constructor() {}

  ngOnInit() {
    this.subscription = this.pwaInstallService.installPromptEvent$.subscribe(event => {
      this.showInstallButton = !!event && !this.pwaInstallService.isPwaInstalled();
      console.log(  this.showInstallButton)
    });
  }

  installPwa() {
    this.pwaInstallService.promptForInstallation();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
