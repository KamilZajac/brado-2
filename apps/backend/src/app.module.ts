import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ReadingModule } from './reading/reading.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HourlyReadingEntity } from './reading/entities/hourly-reading-entity';
import { LiveReadingEntity } from './reading/entities/minute-reading.entity';
import { SettingsModule } from './settings/settings.module';
import { SettingsEntity } from './settings/entities/setting.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UserEntity } from './users/entities/users.entity';
import { AnnotationModule } from './annotation/annotation.module';
import { AnnotationEntity } from './annotation/entities/annotation.entity';
import { TemperatureModule } from './temperature/temperature.module';
import { TemperatureEntity } from './temperature/entities/temperature.entity';
import { WorkingPeriodModule } from './working-period/working-period.module';
import { WorkingPeriodEntity } from './working-period/entities/working-period.entity';
import { NotificationsModule } from './notifications/notifications.module';
import { PushSubscriptionEntity } from './notifications/notifications.entity';

const typeormConf = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: +(process.env.POSTGRES_PORT || 5432),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [
    HourlyReadingEntity,
    LiveReadingEntity,
    SettingsEntity,
    UserEntity,
    AnnotationEntity,
    TemperatureEntity,
    WorkingPeriodEntity,
    PushSubscriptionEntity,
  ],
  synchronize: true,
  // logging: true,
};

if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
  typeormConf.host = 'localhost';
  typeormConf.username = 'brado';
  typeormConf.password = 'brado';
  typeormConf.database = 'brado';

  // dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

@Module({
  imports: [
    ReadingModule,
    TypeOrmModule.forRoot(typeormConf as any),
    SettingsModule,
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    AnnotationModule,
    TemperatureModule,
    WorkingPeriodModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
