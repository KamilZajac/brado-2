import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import {PushSubscriptionEntity} from "./notifications.entity";


const BATCH_SIZE = 500;
const CONCURRENCY = 20;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
      @InjectRepository(PushSubscriptionEntity)
      private readonly repo: Repository<PushSubscriptionEntity>,
  ) {
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
    );
  }
  async upsertSubscription(sub: any, meta?: {
    ua?: string; appVersion?: string; locale?: string; platform?: string;
  }) {
    const { endpoint, keys } = sub;
    const existing = await this.repo.findOne({ where: { endpoint } });

    console.log(sub, meta)

    if (existing) {
      existing.p256dh = keys?.p256dh ?? existing.p256dh;
      existing.auth   = keys?.auth ?? existing.auth;
      existing.userAgent = meta?.ua ?? existing.userAgent;
      existing.appVersion = meta?.appVersion ?? existing.appVersion;
      existing.locale = meta?.locale ?? existing.locale;
      existing.platform = meta?.platform ?? existing.platform;
      existing.revokedAt = null;
      existing.lastSeenAt = new Date();
      return this.repo.save(existing);
    }

    return this.repo.save(this.repo.create({
      endpoint,
      p256dh: keys?.p256dh,
      auth: keys?.auth,
      userAgent: meta?.ua,
      appVersion: meta?.appVersion,
      locale: meta?.locale,
      platform: meta?.platform,
      lastSeenAt: new Date(),
    }));
  }

  async revokeByEndpoint(endpoint: string) {
    console.log('REVOKE')
    console.log(endpoint);
    await this.repo.update({ endpoint }, { revokedAt: new Date() });
  }

  async broadcastAll(payload: { title: string; body: string; url?: string }) {
    let lastId: string | undefined;
    let sent = 0,
      cleaned = 0;

    console.log(payload);

    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.revokedAt IS NULL')
      .orderBy('s.id', 'ASC');

    if (lastId) qb.andWhere('s.id > :lastId', { lastId });

    const batch = await qb.getMany();
    console.log('BATCH');
    console.log(batch);
    if (!batch.length) {
      return
    }

    await this.sendBatch(batch, payload).then((r) => {
      sent += r.sent;
      cleaned += r.cleaned;
    });

    lastId = batch[batch.length - 1].id;

    this.logger.log(`Broadcast finished: sent=${sent}, cleaned=${cleaned}`);
    return { sent, cleaned };
  }

  private async sendBatch(
      subs: PushSubscriptionEntity[],
      payload: { title: string; body: string; url?: string }
  ) {
    let sent = 0, cleaned = 0;
    const queue = subs.slice();
    const workers: Promise<void>[] = [];

    console.log('SUBS')
    console.log(subs)

    const worker = async () => {
      for (;;) {
        const s = queue.pop();
        if (!s) break;

        try {
          const res = await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify(payload),
              { TTL: 60 }
          );
          sent++;
          await this.repo.update(s.id, { lastPushStatus: (res as any)?.statusCode ?? 201 });
        } catch (err: any) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) {
            cleaned++;
            await this.repo.update(s.id, { revokedAt: new Date(), lastPushStatus: code });
          } else {
            await this.repo.update(s.id, { lastPushStatus: code ?? -1 });
            this.logger.warn(`Push error ${code ?? ''} for ${s.id}: ${err?.message ?? err}`);
          }
        }
      }
    };

    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);
    return { sent, cleaned };
  }
}
