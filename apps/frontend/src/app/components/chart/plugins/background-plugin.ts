import {HourlyReading, LiveReading, WorkingPeriod} from "@brado/types";

export const hourlyBackgroundPlugin: any = {
  id: 'hourlyBackground',
  beforeDatasetsDraw(chart: any, args: any, options: any) {
    const {
      ctx,
      chartArea: {top, bottom},
      scales: {x}
    } = chart;

    const workingPeriods = options?.workingPeriods || [];

    if (!workingPeriods.length) {
      return;
    }

    const dataset = chart.data.datasets[0];
    if (!dataset || !Array.isArray(dataset.data)) return;

    const data = dataset.data as { x: number | string | Date; y: number; data: LiveReading | HourlyReading }[];

    if (!x || !x.min || !x.max) return;

    const minTimestamp = x.min;
    const maxTimestamp = x.max;

    // Get all timestamps from the data
    const timestamps = data.map(point => {
      if (point.data.hasOwnProperty('workStartTime')) {
        // For HourlyReading
        return {
          start: +(point.data as HourlyReading).workStartTime,
          end: +(point.data as HourlyReading).workEndTime
        };
      } else {
        // For LiveReading
        const timestamp = +point.data.timestamp;
        return { start: timestamp, end: timestamp };
      }
    });

    // Process each working period
    workingPeriods.forEach((period: WorkingPeriod) => {
      const periodStart = +period.start;
      const periodEnd = period.end ? +period.end : maxTimestamp;

      // Check if this period overlaps with any reading
      const overlapsWithReadings = timestamps.some(ts =>
        (ts.start >= periodStart && ts.start <= periodEnd) || // Reading starts within period
        (ts.end >= periodStart && ts.end <= periodEnd) || // Reading ends within period
        (ts.start <= periodStart && ts.end >= periodEnd) // Reading spans the entire period
      );

      // Skip if no overlap with readings
      if (!overlapsWithReadings) {
        return;
      }

      // Calculate visible part of the period
      const visibleStart = Math.max(periodStart, minTimestamp);
      const visibleEnd = Math.min(periodEnd, maxTimestamp);

      // Skip if period is not visible in current view
      if (visibleStart >= visibleEnd) {
        return;
      }

      // Draw the background for this period
      const startX = x.getPixelForValue(visibleStart);
      const endX = x.getPixelForValue(visibleEnd);

      // Use a nice background color
      const bgColor = period.isManuallyCorrected
        ? 'rgba(255, 206, 86, 0.02)' // yellow for manually corrected periods
        : 'rgba(75, 192, 192, 0.02)'; // light green for normal periods

      ctx.fillStyle = bgColor;
      ctx.fillRect(startX, top, endX - startX, bottom - top);

      // Optionally add a border or label
      ctx.strokeStyle = period.isManuallyCorrected
        ? 'rgba(255, 206, 86, 0.5)'
        : 'rgba(75, 192, 192, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, top, endX - startX, bottom - top);
    });
  }
}
