import { Injectable } from "@angular/core";
import {environment} from "../../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { jwtDecode } from "jwt-decode";

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'auth_token';

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Promise<string> {
    return this.http.post<any>(environment.apiUrl +'/auth/login', { username, password }).toPromise()
      .then(res => {
        const token = res.access_token;
        localStorage.setItem(this.tokenKey, token);
        return token;
      });
  }

  getCurrentUser(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
  }
}
