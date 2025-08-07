import { Injectable, isDevMode, Optional, inject, runInInjectionContext, Injector, PLATFORM_ID } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import {environment} from "../../../environments/environment";

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  readonly VAPID_PUBLIC_KEY = 'BHNL3RvLa0HJwkjUb89LPIngTkkwn1BqAM89cit0022znyww_EI0BT-j0rbHTDLjEXSQiTzwe7NzCIh-ADxWA0I';
  private isServiceWorkerEnabled = !isDevMode();
  private platformId = inject(PLATFORM_ID);


  constructor(private swPush: SwPush, private http: HttpClient) {}

  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (this.swPush == null || !this.swPush.isEnabled) {
      console.log('NO SWPUSH')
      return null;
    }
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }

  async subscribeAndSendToBackend(): Promise<boolean> {
    if (this.swPush == null || !this.swPush.isEnabled) {
      console.log('NO SWPUSH')
      return false;
    }

    // 1) Ensure SW is active
    await navigator.serviceWorker.ready;

    // 2) Ask permission (must be called from user gesture)
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return false;
    }

    // 3) Reuse existing or create new subscription
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY.trim(),
      });
    }

    // 4) Send to backend
    await this.http.post(environment.apiUrl + '/notifications/subscribe', sub).toPromise();
    return true;
  }

  async unsubscribeEverywhere(): Promise<void> {
    const sub = await this.getExistingSubscription();
    if (sub) {
      await this.http.post(environment.apiUrl + '/notifications/unsubscribe', { endpoint: sub.endpoint }).toPromise();
      await sub.unsubscribe();
    }
  }
  //
  //
  //
  //   try {
  //     const sub = await this.swPush.requestSubscription({
  //       serverPublicKey: this.VAPID_PUBLIC_KEY
  //     });
  //     console.log(sub)
  //     console.log('worworkwor')
  //     await this.http.post(environment.apiUrl + '/notifications/subscribe', sub).toPromise();
  //     console.log('Subscribed!');
  //   } catch (err) {
  //     console.error('Push subscription error', err);
  //   }
  // }
  // // subscribeToNotifications() {
  // //   if (!this.swPush) {
  // //     console.log('Service Worker is not enabled in development mode');
  // //     return;
  // //   }
  // //
  // //   console.log('subscribeToNotifications()');
  // //   console.log(this.swPush.isEnabled)
  // //   if (this.swPush.isEnabled) {
  // //     this.swPush.requestSubscription({
  // //       serverPublicKey: this.VAPID_PUBLIC_KEY
  // //     }).then(sub => {
  // //       console.log('SYB')
  // //       console.log(sub)
  // //       this.http.post(environment.apiUrl + '/notifications/subscribe', sub).subscribe();
  // //     }).catch(err => console.error('Push subscription error', err));
  // //   }
  // // }
  //
  // listenForMessages() {
  //   if (!this.swPush) {
  //     console.log('Service Worker is not enabled in development mode');
  //     return;
  //   }
  //
  //   this.swPush.messages.subscribe(msg => {
  //     console.log('Push message received:', msg);
  //     alert(JSON.stringify(msg));
  //   });
  //
  //   this.swPush.notificationClicks.subscribe(event => {
  //     console.log('Notification clicked:', event);
  //   });
  // }
}
