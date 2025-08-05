import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private deferredPrompt: any;
  private installPromptEvent = new BehaviorSubject<any>(null);

  installPromptEvent$ = this.installPromptEvent.asObservable();

  constructor(private platform: Platform) {
    this.init();
  }

  init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Update UI to notify the user they can install the PWA
      this.installPromptEvent.next(e);
    });

    window.addEventListener('appinstalled', () => {
      // Clear the deferredPrompt so it can be garbage collected
      this.deferredPrompt = null;
      this.installPromptEvent.next(null);
      console.log('PWA was installed');
    });
  }

  canPromptForInstallation(): boolean {
    return !!this.deferredPrompt;
  }

  promptForInstallation() {
    if (!this.deferredPrompt) {
      return Promise.reject(new Error('Installation prompt not available'));
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    return this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // We no longer need the prompt
      this.deferredPrompt = null;
      this.installPromptEvent.next(null);
    });
  }

  isPwaInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }
}
