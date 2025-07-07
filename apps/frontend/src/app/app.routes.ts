import { Routes } from '@angular/router';
import {WeeklyComponent} from "./pages/weekly/weekly.component";
import {LiveComponent} from "./pages/live/live.component";
import {CompareComponent} from "./pages/compare/compare.component";
import {SettingsComponent} from "./pages/settings/settings.component";
import {SettingsResolver} from "./services/settings/settings.service";
import {UsersComponent} from "./pages/users/users.component";
import {LoginComponent} from "./pages/login/login.component";
import {TemperatureComponent} from "./pages/temperature/temperature.component";
import {DashboardComponent} from "./pages/dashboard/dashboard.component";
import {WorkPeriodsComponent} from "./pages/work-periods/work-periods.component";
import {TempChartComponent} from "./pages/temperature/temp-chart/temp-chart.component";

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    data: { mode: 'default' },

  },
  {
    path: 'dashboard-admin',
    component: DashboardComponent,
    data: { mode: 'admin' },
  },
  {
    path: 'weekly',
    component: WeeklyComponent,
  },
  {
    path: 'sessions',
    component: WorkPeriodsComponent,
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
    path: 'temperatures/:id',
    component: TempChartComponent,
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
