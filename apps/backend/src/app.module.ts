import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {DataController} from "./data/data.controller";
import {DataService} from "./data/data.service";
import { ReadingModule } from './reading/reading.module';
import {DataModule} from "./data/data.module";
import {TypeOrmModule} from "@nestjs/typeorm";

@Module({
  imports: [
      ReadingModule,
      DataModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
  ],
  controllers: [AppController, DataController],
  providers: [AppService, DataService],
})
export class AppModule {}
