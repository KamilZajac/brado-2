import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {DataController} from "./data/data.controller";
import {DataService} from "./data/data.service";
import {ReadingModule} from './reading/reading.module';
import {DataModule} from "./data/data.module";
import {TypeOrmModule} from "@nestjs/typeorm";
import {HourlyReadingEntity} from "./reading/entities/hourly-reading-entity";
import {LiveReadingEntity} from "./reading/entities/minute-reading.entity";

import * as path from 'path';
import * as dotenv from 'dotenv';

const typeormConf = {
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: +(process.env.POSTGRES_PORT || 5432),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [HourlyReadingEntity, LiveReadingEntity],
    synchronize: true,
}

if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
    typeormConf.host = 'localhost';
    typeormConf.username = 'brado';
    typeormConf.password = 'brado';
    typeormConf.database = 'brado';

    dotenv.config({path: path.resolve(__dirname, '../../../.env')});
}

console.log(typeormConf
)

@Module({
    imports: [
        ReadingModule,
        DataModule,
        TypeOrmModule.forRoot(typeormConf as any),
    ],
    controllers: [AppController, DataController],
    providers: [AppService, DataService],
})
export class AppModule {
}
