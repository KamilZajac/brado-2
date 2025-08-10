import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {environment} from "../../../environments/environment";

type PushState = 'unsupported' | 'prompt' | 'denied' | 'enabled' | 'idle';

@Injectable({ providedIn: 'root' })
export class PushService {
  // readonly vapidPublicKey = 'BHNL3RvLa0HJwkjUb89LPIngTkkwn1BqAM89cit0022znyww_EI0BT-j0rbHTDLjEXSQiTzwe7NzCIh-ADxWA0I';

  private vapidPublicKey?: string;
  private _state$ = new BehaviorSubject<PushState>('idle');
  readonly state$ = this._state$.asObservable();
  get isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /** Call on app start to sync with backend and set UI state */
  async heartbeatOnAppStart() {
    console.log('START')
    if (!this.isSupported) { this._state$.next('unsupported'); return; }


    const permission = Notification.permission;

    console.log(permission);

    if (permission === 'denied') { this._state$.next('denied'); return; }

    // Ensure Angular SW is ready (you already register via provideServiceWorker)
    const reg = await navigator.serviceWorker.ready.catch(() => {
      console.log('Worker not available')
      return null
    });

    console.log(reg)
    if (!reg) {
      this._state$.next('unsupported');
      console.log('UNSUPPORTED');
      return;
    }

    const sub = await reg.pushManager.getSubscription();

    console.log('GETTING SUB')
    console.log(permission);
    if (permission === 'granted') {
      if (sub) {
        await this.sendToBackend(sub).catch(() => {});
        this._state$.next('enabled');
      } else {
        this._state$.next('prompt'); // permission ok but not subscribed yet
      }
    } else {
      this._state$.next('prompt'); // 'default' → user hasn’t decided yet
    }
  }

  /** User clicks “Enable notifications” */
  async enableNotifications(): Promise<boolean> {
    if (!this.isSupported) { this._state$.next('unsupported'); return false; }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { this._state$.next(permission === 'denied' ? 'denied' : 'prompt'); return false; }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      const appKey = await this.getVapidPublicKey();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(appKey),
      });
    }

    await this.sendToBackend(sub);
    this._state$.next('enabled');
    return true;
  }

  /** Optional: manual unsubscribe button */
  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;
    const ok = await sub.unsubscribe();
    if (ok) {
      await fetch(environment.apiUrl + '/push/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
      this._state$.next('prompt');
    }
    return ok;
  }

  // ---- helpers ----

  private async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) return this.vapidPublicKey;
    const res = await fetch(environment.apiUrl + '/push/public-key', {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json();
    this.vapidPublicKey = data.publicKey;
    return this.vapidPublicKey!;
  }

  private async sendToBackend(sub: PushSubscription) {
    const payload = {
      subscription: sub,
      ua: navigator.userAgent,
      appVersion: (window as any).__APP_VERSION__ ?? undefined, // optional
      locale: navigator.language,
      platform: this.detectPlatform(),
    };
    await fetch(environment.apiUrl + '/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
  }

  private detectPlatform(): string {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'desktop';
  }

  private urlBase64ToUint8Array(base64: string) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64Safe);
    const output = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
    return output;
  }
}
