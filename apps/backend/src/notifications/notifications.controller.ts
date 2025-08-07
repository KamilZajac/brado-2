import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('subscribe')
  async subscribe(@Body() subscription: any) {
    return this.notificationsService.saveSubscription(subscription);
  }

  @Post('send')
  async send(@Body() payload: any) {
    return this.notificationsService.sendNotification(payload);
  }
}
