import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { LiveReading, LiveUpdate, TempReading } from '@brado/types';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: ['https://brado-2.harea.digital'],
    credentials: true
  }
})
export class ReadingsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  afterInit() {
    console.log('WebSocket gateway initialized');
  }

  sendNewReading(readings: LiveReading[]) {
    this.server.emit('new-reading', readings);
  }

  sendLifeUpdate(update: LiveUpdate) {
    this.server.emit('live-update', update);
  }

  sendLifeTempUpdate(tempReadings: TempReading[]) {
    this.server.emit('live-temp-update', tempReadings);
  }
}
