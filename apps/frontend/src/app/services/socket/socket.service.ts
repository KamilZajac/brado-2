import { Injectable } from '@angular/core';
import {io, Socket} from "socket.io-client";
import {Observable} from "rxjs";
import {LiveUpdate} from "@brado/types";
import {environment} from "../../../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.apiUrl);
  }

  onNewReading(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('new-reading', (data) => {
        observer.next(data);
      });
    });
  }


  onLiveUpdate(): Observable<any> {
    console.log('listening');
    console.log('live-update');

    return new Observable(observer => {
      this.socket.on('live-update', (data:LiveUpdate) => {
        observer.next(data);
      });
    });
  }
}
