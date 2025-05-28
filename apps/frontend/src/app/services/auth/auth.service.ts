import {computed, Injectable, Signal, signal } from "@angular/core";
import {environment} from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { jwtDecode } from "jwt-decode";
import {User} from "@brado/types";

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';

  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser: Signal<User | null> = computed(() => this._currentUser());



  constructor(private http: HttpClient) {}

  login(username: string, password: string): Promise<string> {
    return this.http.post<any>(environment.apiUrl +'/auth/login', { username, password }).toPromise()
      .then(res => {
        const token = res.access_token;
        localStorage.setItem(this.tokenKey, token);

        this._currentUser.set(jwtDecode<User>(token))
        return token;
      });
  }

  getCurrentUser(): void{
    const token = this.getToken();
    this._currentUser.set(token ? jwtDecode<User>(token) : null)
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this._currentUser.set(null)
  }
}
