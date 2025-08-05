import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PwaInstallService } from '../../services/pwa/pwa-install.service';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon],
  template: `
    <ion-button *ngIf="showInstallButton" (click)="installPwa()" color="primary">
      <ion-icon name="download-outline" slot="start"></ion-icon>
      Install App
    </ion-button>
  `,
  styles: []
})
export class PwaInstallComponent implements OnInit, OnDestroy {
  showInstallButton = false;
  private subscription: Subscription | null = null;

  constructor(private pwaInstallService: PwaInstallService) {}

  ngOnInit() {
    this.subscription = this.pwaInstallService.installPromptEvent$.subscribe(event => {
      this.showInstallButton = !!event && !this.pwaInstallService.isPwaInstalled();
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
