import 'chart.js';
import { ChartType } from 'chart.js';

declare module 'chart.js' {
  interface PluginOptionsByType<TType extends ChartType> {
    hourlyBackground?: {
      hourlyTarget: number
    };
  }
}
