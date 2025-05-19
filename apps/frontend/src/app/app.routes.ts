import { Routes } from '@angular/router';
import {WeeklyComponent} from "./pages/weekly/weekly.component";
import {LiveComponent} from "./pages/live/live.component";
import {CompareComponent} from "./pages/compare/compare.component";
import {SettingsComponent} from "./pages/settings/settings.component";
import {SettingsResolver} from "./services/settings/settings.service";

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'live',
    pathMatch: 'full',
  },
  {
    path: 'weekly',
    component: WeeklyComponent,
  },
  {
    path: 'live',
    component: LiveComponent,
  },
  {
    path: 'compare',
    component: CompareComponent,
  },
  {
    path: 'settings',
    component: SettingsComponent,
    resolve: {
      settings: SettingsResolver
    }
  },

];
