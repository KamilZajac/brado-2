
import { Injectable } from '@nestjs/common';
import * as webPush from 'web-push';

@Injectable()
export class NotificationsService {
    private readonly subscriptions: any[] = [];

    constructor() {
        webPush.setVapidDetails(
            'mailto:zajackamil1@gmail.com',
            'BHNL3RvLa0HJwkjUb89LPIngTkkwn1BqAM89cit0022znyww_EI0BT-j0rbHTDLjEXSQiTzwe7NzCIh-ADxWA0I',
            'bhUbF9pK2w_BkV3mJtbm64vislY69rfpkoHhhLUwNNg'
        );
    }

    saveSubscription(subscription: any) {
        this.subscriptions.push(subscription);
        return { message: 'Subscription saved' };
    }

    async sendNotification(payload: any) {
        const promises = this.subscriptions.map(sub =>
            webPush.sendNotification(sub, JSON.stringify(payload))
                .catch(err => console.error('Push error', err))
        );
        await Promise.all(promises);
        return { message: 'Notifications sent' };
    }
}
