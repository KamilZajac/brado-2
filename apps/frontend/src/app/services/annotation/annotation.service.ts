import {Annotation, HourlyReading} from "@brado/types";
import {environment} from "../../../environments/environment";
import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class AnnotationService {

  constructor(private http: HttpClient) {
  }

  createAnnotation(annotation: Partial<Annotation>): Observable<Annotation> {
    return this.http.post<Annotation>(environment.apiUrl + '/annotation', annotation);
  }

  deleteAnnotation(id: number): Observable<any> {
    return this.http.delete(environment.apiUrl + '/annotation/' + id);
  }

  getAnnotationsBetween(fromTS: number, toTS: number): Observable<Annotation[]> {
    return this.http.get<Annotation[]>(environment.apiUrl + `/annotation/between/${fromTS}/${toTS}`);
  }

  getAnnotationsAfter(fromTS: number): Observable<Annotation[]> {
    return this.http.get<Annotation[]>(environment.apiUrl + `/annotation/after/${fromTS}`);
  }

  getAnnotationsForCurrentPeriod() {
    return this.http.get<Annotation[]>(environment.apiUrl + `/annotation/current`);

  }
}
