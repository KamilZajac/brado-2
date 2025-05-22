import {LiveReading} from "@brado/types";


export const hourlyBackgroundPlugin: any = {
  id: 'hourlyBackground',
  beforeDatasetsDraw(chart: any, args: any, options: any) {
    const {
      ctx,
      chartArea: {top, bottom},
      scales: {x}
    } = chart;

    const hourlyTarget = options?.hourlyTarget || 0;

    if(!hourlyTarget) {
      return
    }

    const dataset = chart.data.datasets[0];
    if (!dataset || !Array.isArray(dataset.data)) return;

    const data = dataset.data as { x: number | string | Date; y: number }[];


    if(!x || !x.min || !x.max) return;

    const minTimestamp = x.min;
    const maxTimestamp = x.max;

    const startHour = new Date(minTimestamp);
    startHour.setMinutes(0, 0, 0);

    const endHour = new Date(maxTimestamp);
    endHour.setMinutes(0, 0, 0);

    for (let ts = startHour.getTime(); ts <= endHour.getTime(); ts += 3600000) {
      const start = ts;
      const end = ts + 3600000;

      // Filter points within the hour
      const points = data.filter(d => {
        const time = new Date(d.x).getTime();
        return time >= start && time < end;
      });

      let sum =  0;

      points.forEach((p: any) => sum += p.data.delta)

      // // Get background color based on average value
      let bgColor = 'rgba(230, 230, 230, 0.1)'; // fallback

      if( sum != 0) {
        const ratio = sum / hourlyTarget

        if (ratio < 0.3) bgColor = 'rgba(255, 99, 132, 0.3)';       // red
        else if (ratio < 0.6) bgColor = 'rgba(255, 159, 64, 0.15)';  // orange
        else if (ratio < .8) bgColor = 'rgba(255, 206, 86, 0.15)';  // yellow
        else if (ratio <= 1) bgColor = 'rgba(75, 192, 192, 0.15)';  // light green
        else bgColor = 'rgba(52,220,121,0.15)';
      }

      const startX = x.getPixelForValue(start);
      const endX = x.getPixelForValue(end);

      ctx.fillStyle = bgColor;
      ctx.fillRect(startX, top, endX - startX, bottom - top);
    }
  }
}
