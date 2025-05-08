import { Routes } from '@angular/router';
import {WeeklyComponent} from "./pages/weekly/weekly.component";
import {LiveComponent} from "./pages/live/live.component";
import {CompareComponent} from "./pages/compare/compare.component";

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

];
