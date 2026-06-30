import { Inject, Injectable } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { getLogger } from 'src/logger/global-app-logger';
import { NotificationDeviceRepositoryPort } from './ports/notification-device.repository.port';

export interface PushPayload {
    title: string;
    body: string;
    /** Routing metadata for the client (e.g. setCode/cardNumber to open a card). */
    data?: Record<string, string>;
}

@Injectable()
export class PushService {
    private readonly LOGGER = getLogger(PushService.name);
    private readonly expo = new Expo();

    constructor(
        @Inject(NotificationDeviceRepositoryPort)
        private readonly devices: NotificationDeviceRepositoryPort
    ) {}

    /**
     * Fan a push out to all of a user's registered devices. Best-effort: send
     * failures are logged and swallowed (never block the caller), and tokens
     * Expo reports as no longer registered are pruned.
     */
    async sendToUser(userId: number, payload: PushPayload): Promise<void> {
        try {
            const registered = await this.devices.findByUserId(userId);
            const tokens = registered.map((d) => d.token).filter((t) => Expo.isExpoPushToken(t));
            if (tokens.length === 0) {
                return;
            }

            const messages: ExpoPushMessage[] = tokens.map((to) => ({
                to,
                sound: 'default',
                title: payload.title,
                body: payload.body,
                data: payload.data ?? {},
            }));

            for (const chunk of this.expo.chunkPushNotifications(messages)) {
                try {
                    const tickets = await this.expo.sendPushNotificationsAsync(chunk);
                    await this.pruneInvalidTokens(chunk, tickets, userId);
                } catch (err) {
                    this.LOGGER.warn(
                        `Push send failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`
                    );
                }
            }
        } catch (err) {
            // Best-effort: a device lookup / chunking failure must never block the
            // caller (notifications + email are already persisted).
            this.LOGGER.warn(
                `Push fan-out failed for user ${userId}: ${err instanceof Error ? err.message : String(err)}`
            );
        }
    }

    /**
     * A `DeviceNotRegistered` ticket means the app was uninstalled or the token
     * rotated; drop that token so we stop pushing to a dead device.
     */
    private async pruneInvalidTokens(
        chunk: ExpoPushMessage[],
        tickets: ExpoPushTicket[],
        userId: number
    ): Promise<void> {
        await Promise.all(
            tickets.map(async (ticket, i) => {
                if (ticket.status !== 'error' || ticket.details?.error !== 'DeviceNotRegistered') {
                    return;
                }
                const to = chunk[i]?.to;
                const token = Array.isArray(to) ? to[0] : to;
                if (token) {
                    await this.devices.deleteByToken(token, userId);
                    this.LOGGER.debug(`Pruned dead push token for user ${userId}.`);
                }
            })
        );
    }
}
