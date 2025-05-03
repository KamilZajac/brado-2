import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
} from '@nestjs/websockets';
import {Server} from 'socket.io';
import {Injectable} from '@nestjs/common';
import {LiveReading, LiveUpdate} from "@brado/types";

@Injectable()
@WebSocketGateway({cors: true})
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
}
