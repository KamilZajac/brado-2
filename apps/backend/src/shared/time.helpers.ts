import { DateTime } from 'luxon';

export class TimeHelper {
  static todayFromTo() {
    // Define Polish timezone
    const timezone = 'Europe/Warsaw';

    // Get current date in Polish timezone
    const now = DateTime.now().setZone(timezone);

    // Get start and end of the day in that timezone
    const startOfDay = now.startOf('day');
    const endOfDay = now.endOf('day');

    // Get timestamps in milliseconds
    const from = startOfDay.toMillis();
    const to = endOfDay.toMillis();

    return { from, to}
  }
}
