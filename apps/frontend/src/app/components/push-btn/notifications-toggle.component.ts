// src/app/shared/notifications-toggle/notifications-toggle.component.ts
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import {PushService} from "../../services/push/push-notification.service";
import { IonCard, IonCardContent, IonIcon, IonButton, IonItem, IonLabel } from '@ionic/angular/standalone';
import { AsyncPipe, NgIf } from '@angular/common';
import {addIcons} from "ionicons";
import {
  alertCircleOutline, closeOutline, notifications, notificationsOutline

} from "ionicons/icons";

@Component({
  selector: 'app-notifications-toggle',
  templateUrl: './notifications-toggle.component.html',
  imports: [IonCard, IonCardContent, IonIcon, IonButton, IonItem, IonLabel, AsyncPipe, NgIf]
})
export class NotificationsToggleComponent implements OnInit {
  state$!: Observable<'unsupported' | 'prompt' | 'denied' | 'enabled' | 'idle'>;

  constructor(private push: PushService) {

    addIcons({
      alertCircleOutline,
      notificationsOutline,
      notifications,

      closeOutline
    });
  }

  ngOnInit() {
    this.state$ = this.push.state$;
    // Optionally kick heartbeat here if not already called in AppComponent
    // this.push.heartbeatOnAppStart();
  }

  enable() { this.push.enableNotifications(); }
  async disable() { await this.push.unsubscribe(); }
}
