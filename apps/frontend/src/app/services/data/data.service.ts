import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../../environments/environment";
import {Observable} from "rxjs";
import {DataReading} from "@brado/shared-models";

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private http: HttpClient) {}


  public getDataAfterTimestamp(timestamp: Date): Observable<DataReading[]> {
    return this.http.get<DataReading[]>(environment.apiUrl + '/reading/after/'+timestamp)
  }
}
