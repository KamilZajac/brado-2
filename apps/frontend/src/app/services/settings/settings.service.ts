import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {BehaviorSubject, firstValueFrom, Observable, Subject, tap } from 'rxjs';
import {environment} from "../../../environments/environment";
import {SettingsRequest} from "@brado/types";
import { toObservable } from '@angular/core/rxjs-interop'; // Optional if you need Observable from signal
import { Resolve } from '@angular/router';


@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private settingsSignal = signal<SettingsRequest | null>(null);
  public settings = this.settingsSignal;

  constructor(private http: HttpClient) {
    console.log('INIT KURWA')
  }

  saveSettings(settings: SettingsRequest): Observable<any> {
    return this.http.post(environment.apiUrl + '/settings', settings);
  }

  async fetchSettings(): Promise<void> {

    this.http.get<SettingsRequest>(environment.apiUrl + '/settings').subscribe(settings => {
      this.settingsSignal.set(settings);
      console.log('loaded')

    })


  }

}


@Injectable({ providedIn: 'root' })
export class SettingsResolver implements Resolve<void> {
  constructor(private settingsService: SettingsService) {}

  resolve(): Promise<void> {
    return this.settingsService.fetchSettings();
  }
}
