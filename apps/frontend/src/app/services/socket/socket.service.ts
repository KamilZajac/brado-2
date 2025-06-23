import {Injectable} from '@angular/core';
import {io, Socket} from "socket.io-client";
import {Observable} from "rxjs";
import {LiveUpdate} from "@brado/types";
import {environment} from "../../../environments/environment";
import {AuthService} from "../auth/auth.service";

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;

  constructor(private authService: AuthService) {
    this.initSocket()
  }

  public initSocket() {
    const token = this.authService.getToken();
    this.socket = io(environment.apiUrl,
      {
        auth: {token}
      });
  }

  onNewReading(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('new-reading', (data) => {
        observer.next(data);
      });
    });
  }


  onLiveUpdate(): Observable<any> {

    return new Observable(observer => {
      this.socket.on('live-update', (data: LiveUpdate) => {
        observer.next(data);
      });
    });
  }

  onLiveTempUpdate(): Observable<any> {

    return new Observable(observer => {
      this.socket.on('live-temp-update', (data: LiveUpdate) => {
        observer.next(data);
      });
    });
  }
}
