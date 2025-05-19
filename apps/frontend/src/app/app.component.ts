import {Component, OnInit} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {
  IonApp,
  IonSplitPane,
  IonMenu,
  IonContent,
  IonList,
  IonListHeader,
  IonNote,
  IonMenuToggle,
  IonItem,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonRouterLink
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  mailOutline,
  mailSharp,
  paperPlaneOutline,
  paperPlaneSharp,
  heartOutline,
  heartSharp,
  archiveOutline,
  archiveSharp,
  trashOutline,
  trashSharp,
  warningOutline,
  warningSharp,
  bookmarkOutline,
  bookmarkSharp
} from 'ionicons/icons';
import {SettingsService} from "./services/settings/settings.service";

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  providers: [SettingsService],
  imports: [RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterLink, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  public appPages = [
    {title: 'Na żywo', url: '/live', icon: 'mail'},
    {title: 'Tydzień', url: '/weekly', icon: 'paper-plane'},
    {title: 'Porównaj', url: '/compare', icon: 'paper-plane'},
    {title: 'Ustawienia', url: '/settings', icon: 'paper-plane'},
  ];

  constructor(private settingsService: SettingsService) {

    addIcons({
      mailOutline,
      mailSharp,
      paperPlaneOutline,
      paperPlaneSharp,
      heartOutline,
      heartSharp,
      archiveOutline,
      archiveSharp,
      trashOutline,
      trashSharp,
      warningOutline,
      warningSharp,
      bookmarkOutline,
      bookmarkSharp
    });
  }


  public ngOnInit() {
    this.settingsService.fetchSettings().then()
  }
}

