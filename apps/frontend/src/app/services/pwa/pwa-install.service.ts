import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any;
  private installPromptEvent = new BehaviorSubject<any>(null);
  private isIOSDevice = new BehaviorSubject<boolean>(false);

  installPromptEvent$ = this.installPromptEvent.asObservable();
  isIOSDevice$ = this.isIOSDevice.asObservable();

  constructor(private platform: Platform) {
    this.init();
  }

  init() {
    // Check if it's an iOS device
    this.isIOSDevice.next(
      this.platform.is('ios') ||
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.installPromptEvent.next(e);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.installPromptEvent.next(null);
      console.log('PWA was installed');
    });
  }

  canPromptForInstallation(): boolean {
    return !!this.deferredPrompt;
  }

  isIOS(): boolean {
    return this.isIOSDevice.getValue();
  }

  promptForInstallation() {
    if (!this.deferredPrompt) {
      return Promise.reject(new Error('Installation prompt not available'));
    }

    this.deferredPrompt.prompt();
    return this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      this.deferredPrompt = null;
      this.installPromptEvent.next(null);
    });
  }

  isPwaInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }
}
