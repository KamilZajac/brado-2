import {Component, effect, OnInit} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  pulseOutline,
  calendarOutline,
  gitCompareOutline,
  personOutline,
  settingsOutline, downloadOutline
} from 'ionicons/icons';
import {SettingsService} from "./services/settings/settings.service";
import {HeaderComponent} from "./components/header/header.component";
import {AuthService} from "./services/auth/auth.service";
import {UserRole} from "@brado/types";
import {DataStore} from "./services/data/data.store";
import {TemperatureStore} from "./services/temperature/temp.store";
import {PwaInstallComponent} from "./components/pwa-install/pwa-install.component";
import {PushService} from "./services/push/push-notification.service";
import {NotificationsToggleComponent} from "./components/push-btn/notifications-toggle.component";
import {PushInAppService} from "./services/annotation/push-inapp.service";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  providers: [SettingsService],
  imports: [HeaderComponent, RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet, PwaInstallComponent, NotificationsToggleComponent],
})
export class AppComponent {
  showEnableButton = false;

  currentUser = this.auth.currentUser

  appPages =  [
          {title: 'Login', url: '/login', icon: 'settings-outline'},
        ]

  constructor(
    private settingsService: SettingsService,
    private auth: AuthService,
    private dataStore: DataStore,
    private tempStore: TemperatureStore,
    private pushService: PushService,
    private inapp: PushInAppService

  ) {
    effect(() => {
         const user = this.currentUser();
        if(user && user.username) {

          this.dataStore.loadInitialLiveData();
          this.tempStore.loadAll()
          this.settingsService.fetchSettings().then()
          this.dataStore.loadMonthlyWorkingPeriods()
          this.dataStore.loadLiveWorkingPeriods()
          this.dataStore.loadMonthlyStats()

          this.appPages = [
            {title: 'Pulpit ( hala )', url: '/dashboard', icon: 'pulse-outline'},
            {title: 'Na żywo', url: '/live', icon: 'pulse-outline'},
            {title: 'Temperatura', url: '/temperatures', icon: 'calendar-outline'},
            ...user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN ? [
              {title: 'Pulpit ( admin )', url: '/dashboard-admin', icon: 'pulse-outline'},
              {title: 'Miesiac', url: '/month', icon: 'calendar-outline'},
              // {title: 'Uboje', url: '/sessions', icon: 'calendar-outline'},
              {title: 'Własny wykres', url: '/compare', icon: 'git-compare-outline'},
              {title: 'Użytkownicy', url: '/users', icon: 'person-outline'},
              {title: 'Ustawienia', url: '/settings', icon: 'settings-outline'},
            ] : []
          ];
        } else {
          this.appPages = [
            {title: 'Login', url: '/login', icon: 'settings-outline'},
          ]
        }

      console.log(this.appPages);
    });

    addIcons({
      calendarOutline,
      pulseOutline,
      gitCompareOutline,
      personOutline,
      settingsOutline,
      downloadOutline
    });
  }


  public async ngOnInit() {
    this.auth.getCurrentUser();

    this.pushService.heartbeatOnAppStart();
    this.inapp.bindServiceWorkerMessages();

  }




  // public get appPages(){
  //   const user = this.auth.currentUser();
  //

  // }
}
