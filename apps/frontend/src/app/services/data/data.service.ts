import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {Observable} from "rxjs";
import {HourlyReading, LiveReading, LiveUpdate} from "@brado/types";

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


@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) {}

  public getDataAfterTimestamp(timestamp: number): Observable<LiveReading[]> {
    return this.http.get<LiveReading[]>(environment.apiUrl + '/reading/after/'+timestamp)
  }

  public getInitialLiveData(): Observable<LiveUpdate> {
    return this.http.get<LiveUpdate>(environment.apiUrl + '/reading/live-init/' + getStartOfToday())
  }

  public getHourlyBetween(fromTS: number, toTS: number): Observable<HourlyReading[]> {
    return this.http.get<HourlyReading[]>(environment.apiUrl + `/reading/hourly/${fromTS}/${toTS}`)
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
