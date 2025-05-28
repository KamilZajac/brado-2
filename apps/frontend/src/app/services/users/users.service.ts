import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {CreateUser, User} from "@brado/types";
import {environment} from "../../../environments/environment";

@Injectable({providedIn: 'root'})
export class UsersApiService {
  constructor(private http: HttpClient) {
  }

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(environment.apiUrl +'/users');
  }

  getById(id: string): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/users/${id}`);
  }

  create(user: CreateUser): Observable<User> {
    return this.http.post<User>(environment.apiUrl + '/users', user);
  }

  update(id: number, updates: Partial<User>): Observable<User> {
    return this.http.put<User>(`${environment.apiUrl}/users/${id}`, updates);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/users/${id}`);
  }
}
