import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {DataController} from "./data/data.controller";
import {DataService} from "./data/data.service";
import { ReadingModule } from './reading/reading.module';
import {DataModule} from "./data/data.module";
import {TypeOrmModule} from "@nestjs/typeorm";
import { join } from 'path';
import {HourlyReadingEntity} from "./reading/entities/hourly-reading-entity";
import {LiveReadingEntity} from "./reading/entities/minute-reading.entity";

@Module({
  imports: [
      ReadingModule,
      DataModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres', // this is the Docker Compose service name
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'brado',
      entities: [HourlyReadingEntity, LiveReadingEntity],
      synchronize: true,
    }),
  ],
  controllers: [AppController, DataController],
  providers: [AppService, DataService],
})
export class AppModule {}
