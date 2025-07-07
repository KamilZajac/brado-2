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
  settingsOutline
} from 'ionicons/icons';
import {SettingsService} from "./services/settings/settings.service";
import {HeaderComponent} from "./components/header/header.component";
import {AuthService} from "./services/auth/auth.service";
import {UserRole} from "@brado/types";
import {DataStore} from "./services/data/data.store";
import {TemperatureStore} from "./services/temperature/temp.store";
import {AnnotationsStore} from "./services/annotation/annotations.store";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  providers: [SettingsService],
  imports: [HeaderComponent, RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  currentUser = this.auth.currentUser

  appPages =  [
          {title: 'Login', url: '/login', icon: 'settings-outline'},
        ]

  constructor(private settingsService: SettingsService, private auth: AuthService, private dataStore: DataStore, private tempStore: TemperatureStore, private annotationsStore: AnnotationsStore) {
    effect(() => {
         const user = this.currentUser();
        if(user && user.username) {

          this.dataStore.loadInitialLiveData();
          this.tempStore.loadAll()
          this.settingsService.fetchSettings().then()
          this.dataStore.loadWorkingPeriods()
          this.dataStore.loadWorkingPeriods()

          this.appPages = [
            {title: 'Pulpit ( hala )', url: '/dashboard', icon: 'pulse-outline'},
            {title: 'Pulpit ( admin )', url: '/dashboard-admin', icon: 'pulse-outline'},
            {title: 'Na żywo', url: '/live', icon: 'pulse-outline'},
            ...user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN ? [
              {title: 'Tydzień', url: '/weekly', icon: 'calendar-outline'},
              {title: 'Uboje', url: '/sessions', icon: 'calendar-outline'},
              {title: 'Temperatura', url: '/temperatures', icon: 'calendar-outline'},
              {title: 'Porównaj', url: '/compare', icon: 'git-compare-outline'},
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
      settingsOutline
    });
  }


  public ngOnInit() {
    this.auth.getCurrentUser()
  }

  // public get appPages(){
  //   const user = this.auth.currentUser();
  //

  // }
}

