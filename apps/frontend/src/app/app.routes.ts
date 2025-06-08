import { Routes } from '@angular/router';
import {WeeklyComponent} from "./pages/weekly/weekly.component";
import {LiveComponent} from "./pages/live/live.component";
import {CompareComponent} from "./pages/compare/compare.component";
import {SettingsComponent} from "./pages/settings/settings.component";
import {SettingsResolver} from "./services/settings/settings.service";
import {UsersComponent} from "./pages/users/users.component";
import {LoginComponent} from "./pages/login/login.component";
import {TemperatureComponent} from "./pages/temperature/temperature.component";

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
    path: 'users',
    component: UsersComponent,
  },
  {
    path: 'temperatures',
    component: TemperatureComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'settings',
    component: SettingsComponent,
    resolve: {
      settings: SettingsResolver
    }
  },

];
