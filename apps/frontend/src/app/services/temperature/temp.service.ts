import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {Observable} from "rxjs";
import {HourlyReading, LiveReading, LiveUpdate, TempReading} from "@brado/types";



@Injectable({
  providedIn: 'root'
})
export class TempService {

  constructor(private http: HttpClient) {}

  public getAll(): Observable<TempReading[]> {
    return this.http.get<TempReading[]>(environment.apiUrl + '/temperature')
  }

  public getLatest(): Observable<TempReading[]> {
    return this.http.get<TempReading[]>(environment.apiUrl + '/temperature/latest')
  }

  exportToExcel(tempID: string) {
    return this.http.get(environment.apiUrl + `/temperature/export/${tempID}`, {
      responseType: 'blob',
    });
  }
  exportAllToExcel() {
    return this.http.get(environment.apiUrl + `/temperature/export-all`, {
      responseType: 'blob',
    });
  }
}
