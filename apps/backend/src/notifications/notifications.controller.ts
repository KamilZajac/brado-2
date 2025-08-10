import { Controller, Post, Body, Delete, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {BroadcastDto, SubscribeDto, UnsubscribeDto} from "./notification.dto";

@Controller('push')
export class NotificationsController {

  constructor(private readonly push: NotificationsService) {}

  @Post('public-key')
  getPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY };
  }

  @Post('subscribe')
  async subscribe(@Body() dto: SubscribeDto) {
    await this.push.upsertSubscription(dto.subscription, {
      ua: dto.ua,
      appVersion: dto.appVersion,
      locale: dto.locale,
      platform: dto.platform,
    });
    return { ok: true };
  }

  @Delete('unsubscribe')
  async unsubscribe(@Body() dto: UnsubscribeDto) {
    await this.push.revokeByEndpoint(dto.endpoint);
    return { ok: true };
  }

  // Protect this endpoint!
  // Todo remove this endpoint
  @Post('broadcast')
  async broadcast(@Body() dto: BroadcastDto) {
    return this.push.broadcastAll({
      title: dto.title,
      body: dto.body,
      url: dto.url ?? '/',
    });
  }
}
