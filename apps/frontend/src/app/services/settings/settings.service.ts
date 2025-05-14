import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {BehaviorSubject, firstValueFrom, Observable, Subject, tap } from 'rxjs';
import {environment} from "../../../environments/environment";

export interface SettingsRequest {
  hourlyTarget: number;
  dailyTarget: number;
  sensorNames: string[];
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  public settingsSubject = new BehaviorSubject<SettingsRequest | null>(null);

  constructor(private http: HttpClient) {

  }

  getSettings(): Observable<SettingsRequest | null> {
    return this.settingsSubject.asObservable();
  }

  saveSettings(settings: SettingsRequest): Observable<any> {
    return this.http.post(environment.apiUrl + '/settings', settings);
  }

  async fetchSettings(): Promise<void> {

    const settings = await firstValueFrom(this.http.get<SettingsRequest>(environment.apiUrl + '/settings'));

      this.settingsSubject.next(settings);


  }

}
