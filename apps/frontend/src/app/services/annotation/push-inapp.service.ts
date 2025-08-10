// push-inapp.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class PushInAppService {
  private bound = false;

  constructor(
    private zone: NgZone,
    private router: Router,
    private toastCtrl: ToastController,
  ) {}

  /** Call once on app start */
  bindServiceWorkerMessages() {
    if (this.bound || !('serviceWorker' in navigator)) return;
    this.bound = true;

    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      const { type, payload, url } = event.data || {};
      if (type === 'PUSH_MESSAGE' && payload) {
        this.zone.run(() => this.showToast(payload));
      }
      if (type === 'PUSH_CLICK' && url) {
        this.zone.run(() => this.router.navigateByUrl(url));
      }
    });
  }

  private async showToast(payload: any) {
    const toast = await this.toastCtrl.create({
      message: payload.body || 'You have an update',
      header: payload.title || 'Notification',
      position: 'top',
      duration: 7000,
      buttons: [
        {
          text: 'Open',
          role: 'confirm',
          handler: () => {
            const url = payload.url || '/';
            this.router.navigateByUrl(url);
          },
        },
        {
          text: 'Dismiss',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }
}
