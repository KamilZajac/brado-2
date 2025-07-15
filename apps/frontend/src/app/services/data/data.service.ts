import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {Observable} from "rxjs";
import {DailyWorkingSummary, HourlyReading, LiveReading, LiveUpdate, WorkingPeriod} from "@brado/types";
import {DateTime} from 'luxon';

export const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime()
}

export function getWeeklyTimestamps() {
  const now = Date.now();

  const today = new Date();
  const dayOfWeek = today.getDay();

  const daysSinceMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(today);
  const daysUntilSunday = (dayOfWeek === 0 ? 0 : 7 - dayOfWeek);
  sunday.setDate(today.getDate() + daysUntilSunday);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.getTime(),
    to: sunday.getTime(),
  };

}


export const getCurrentMonthTimestamps = () => {
  const now = DateTime.now().setZone("Europe/Warsaw");

  const startOfMonth = now.startOf("month").toMillis(); // timestamp in ms
  const endOfMonth = now.endOf("month").toMillis();     // timestamp in ms

  return {
    from: startOfMonth,
    to: endOfMonth,
  };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) {
  }

  public getDataAfterTimestamp(timestamp: number): Observable<LiveReading[]> {
    return this.http.get<LiveReading[]>(environment.apiUrl + '/reading/after/' + timestamp)
  }

  public getInitialLiveData(): Observable<LiveUpdate> {
    return this.http.get<LiveUpdate>(environment.apiUrl + '/reading/live-init/' + getStartOfToday())
  }

  public getHourlyBetween(fromTS: number, toTS: number): Observable<HourlyReading[]> {
    return this.http.get<HourlyReading[]>(environment.apiUrl + `/reading/hourly/${fromTS}/${toTS}`)
  }

  public getWorkingPeriods(): Observable<WorkingPeriod[]> {
    return this.http.get<WorkingPeriod[]>(environment.apiUrl + `/working-period/`)
  }

  public createOrUpdateLiveReading(data: LiveReading): Observable<LiveReading> {
    return this.http.post<LiveReading>(environment.apiUrl + `/reading/update-live-reading`, data)
  }

  public getMonthlyStats(fromTS: number, toTS: number) {
    return this.http.get<{[key: string]: DailyWorkingSummary}>(environment.apiUrl + `/reading/monthly-summary/${fromTS}/${toTS}`);
  }

  public exportData(fromTS: number, toTS: number) {
    return this.http.get(environment.apiUrl + `/reading/export/${fromTS}/${toTS}`, {
      responseType: 'blob',
    });
  }

  public exportLiveData(fromTS: number) {
    return this.http.get(environment.apiUrl + `/reading/export-live/${fromTS}`, {
      responseType: 'blob',
    });
  }


}
