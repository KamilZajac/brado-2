import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { PwaInstallService } from '../../services/pwa/pwa-install.service';
import { IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonCard, IonCardContent, IonCardHeader, IonCardTitle],
  template: `
    <!-- For non-iOS devices -->
    <ion-button *ngIf="showInstallButton && !isIOS" (click)="installPwa()" color="primary">
      <ion-icon name="download-outline" slot="start"></ion-icon>
      Install App
    </ion-button>

    <!-- For iOS devices -->
    <ion-card *ngIf="isIOS && !isPwaInstalled" class="ios-install-card">
      <ion-card-header>
        <ion-card-title>Install Our App</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p>To install this app on your iPhone:</p>
        <ol>
          <li>Tap the Share button <ion-icon name="share-outline"></ion-icon> in Safari</li>
          <li>Scroll down and tap "Add to Home Screen"</li>
          <li>Tap "Add" in the top-right corner</li>
        </ol>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .ios-install-card {
      margin: 16px;
      border-radius: 8px;
    }
  `]
})
export class PwaInstallComponent implements OnInit, OnDestroy {
  showInstallButton = false;
  isIOS = false;
  isPwaInstalled = false;
  private subscription: Subscription[] = [];

  private pwaInstallService = inject(PwaInstallService);

  constructor() {}

  ngOnInit() {
    // Subscribe to the install prompt event
    this.subscription.push(
      this.pwaInstallService.installPromptEvent$.subscribe(event => {
        this.showInstallButton = !!event && !this.pwaInstallService.isPwaInstalled();
        console.log('Install button visibility:', this.showInstallButton);
      })
    );

    // Check if it's an iOS device
    this.isIOS = this.pwaInstallService.isIOS();
    this.isPwaInstalled = this.pwaInstallService.isPwaInstalled();

    console.log('Device is iOS:', this.isIOS);
    console.log('PWA is installed:', this.isPwaInstalled);
  }

  installPwa() {
    this.pwaInstallService.promptForInstallation();
  }

  ngOnDestroy() {
    this.subscription.forEach(sub => sub.unsubscribe());
  }
}
