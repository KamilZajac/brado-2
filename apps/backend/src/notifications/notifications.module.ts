import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionEntity } from './notifications.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscriptionEntity])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
