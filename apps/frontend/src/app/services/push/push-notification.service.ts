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
  private swPush: SwPush | null = null;
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient, private injector: Injector) {
    // Only try to get SwPush if we're not in dev mode and we're in a browser
    if (!isDevMode() && isPlatformBrowser(this.platformId)) {
      runInInjectionContext(this.injector, () => {
        try {
          this.swPush = inject(SwPush, { optional: true });
          if (!this.swPush) {
            console.log('duda')
            console.log('SwPush is not available (optional inject)');
          }
        } catch (e) {
          console.log('duap')
          console.log('SwPush is not available:', e);
          this.swPush = null;
        }
      });
    }
  }


  async subscribeToNotifications() {
    if (!this.swPush.isEnabled) {
      console.warn('SW not enabled – are you on https and running a prod build?');
      return;
    }

    // Request permission first (must be from a user gesture)
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        console.warn('Notifications permission denied by user');
        return;
      }
    }

    if(this.swPush == null) {
      return
    }

    try {
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });
      console.log(sub)
      console.log('worworkwor')
      await this.http.post(environment.apiUrl + '/notifications/subscribe', sub).toPromise();
      console.log('Subscribed!');
    } catch (err) {
      console.error('Push subscription error', err);
    }
  }
  // subscribeToNotifications() {
  //   if (!this.swPush) {
  //     console.log('Service Worker is not enabled in development mode');
  //     return;
  //   }
  //
  //   console.log('subscribeToNotifications()');
  //   console.log(this.swPush.isEnabled)
  //   if (this.swPush.isEnabled) {
  //     this.swPush.requestSubscription({
  //       serverPublicKey: this.VAPID_PUBLIC_KEY
  //     }).then(sub => {
  //       console.log('SYB')
  //       console.log(sub)
  //       this.http.post(environment.apiUrl + '/notifications/subscribe', sub).subscribe();
  //     }).catch(err => console.error('Push subscription error', err));
  //   }
  // }

  listenForMessages() {
    if (!this.swPush) {
      console.log('Service Worker is not enabled in development mode');
      return;
    }

    this.swPush.messages.subscribe(msg => {
      console.log('Push message received:', msg);
    });

    this.swPush.notificationClicks.subscribe(event => {
      console.log('Notification clicked:', event);
    });
  }
}
