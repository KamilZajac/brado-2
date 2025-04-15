import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';
import {DataReading} from "@brado/shared-models";

@Injectable()
@WebSocketGateway({ cors: true })
export class ReadingsGateway implements OnGatewayInit {
    @WebSocketServer()
    server: Server;

    afterInit() {
        console.log('WebSocket gateway initialized');
    }

    sendNewReading(readings: DataReading[]) {
        this.server.emit('new-reading', readings);
    }
}
