import 'chart.js';
import { ChartType } from 'chart.js';
import {WorkingPeriod} from "@brado/types";

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    hourlyBackground?: {
      workingPeriods: WorkingPeriod[]
    };
  }
}
