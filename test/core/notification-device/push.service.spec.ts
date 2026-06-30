import { NotificationDevice } from 'src/core/notification-device/notification-device.entity';
import { NotificationDeviceRepositoryPort } from 'src/core/notification-device/ports/notification-device.repository.port';
import { PushService } from 'src/core/notification-device/push.service';

// expo-server-sdk ships ESM and isn't transformed by ts-jest, so replace it with
// a factory mock that exposes controllable fns via `__mock`.
jest.mock('expo-server-sdk', () => {
    const send = jest.fn();
    const chunk = jest.fn((messages: unknown[]) => [messages]);
    const isExpoPushToken = jest.fn(
        (t: unknown) => typeof t === 'string' && t.startsWith('ExponentPushToken')
    );
    class Expo {
        static isExpoPushToken = isExpoPushToken;
        chunkPushNotifications = chunk;
        sendPushNotificationsAsync = send;
    }
    return { Expo, __mock: { send, chunk, isExpoPushToken } };
});

const { __mock } = jest.requireMock('expo-server-sdk') as {
    __mock: { send: jest.Mock; chunk: jest.Mock; isExpoPushToken: jest.Mock };
};

function device(token: string): NotificationDevice {
    return new NotificationDevice({ id: 1, userId: 1, token, platform: 'ios' });
}

describe('PushService', () => {
    let service: PushService;
    const repo: jest.Mocked<NotificationDeviceRepositoryPort> = {
        upsertByToken: jest.fn(),
        findByUserId: jest.fn(),
        deleteByToken: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        __mock.send.mockResolvedValue([]);
        __mock.chunk.mockImplementation((messages: unknown[]) => [messages]);
        __mock.isExpoPushToken.mockImplementation(
            (t: unknown) => typeof t === 'string' && t.startsWith('ExponentPushToken')
        );
        service = new PushService(repo);
    });

    it('does nothing when the user has no registered devices', async () => {
        repo.findByUserId.mockResolvedValue([]);

        await service.sendToUser(1, { title: 't', body: 'b' });

        expect(__mock.send).not.toHaveBeenCalled();
    });

    it('only sends to valid Expo push tokens', async () => {
        repo.findByUserId.mockResolvedValue([
            device('ExponentPushToken[valid]'),
            device('garbage-token'),
        ]);

        await service.sendToUser(1, { title: 't', body: 'b', data: { setCode: 'TST' } });

        expect(__mock.send).toHaveBeenCalledTimes(1);
        const sent = __mock.send.mock.calls[0][0];
        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ to: 'ExponentPushToken[valid]', data: { setCode: 'TST' } });
    });

    it('prunes tokens Expo reports as DeviceNotRegistered', async () => {
        repo.findByUserId.mockResolvedValue([device('ExponentPushToken[dead]')]);
        __mock.send.mockResolvedValue([
            { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
        ]);

        await service.sendToUser(1, { title: 't', body: 'b' });

        expect(repo.deleteByToken).toHaveBeenCalledWith('ExponentPushToken[dead]', 1);
    });

    it('does not prune tokens on a successful send', async () => {
        repo.findByUserId.mockResolvedValue([device('ExponentPushToken[ok]')]);
        __mock.send.mockResolvedValue([{ status: 'ok', id: 'receipt-1' }]);

        await service.sendToUser(1, { title: 't', body: 'b' });

        expect(repo.deleteByToken).not.toHaveBeenCalled();
    });

    it('swallows send errors (best-effort)', async () => {
        repo.findByUserId.mockResolvedValue([device('ExponentPushToken[ok]')]);
        __mock.send.mockRejectedValue(new Error('network down'));

        await expect(service.sendToUser(1, { title: 't', body: 'b' })).resolves.toBeUndefined();
    });

    it('swallows a device-lookup failure (best-effort)', async () => {
        repo.findByUserId.mockRejectedValue(new Error('db down'));

        await expect(service.sendToUser(1, { title: 't', body: 'b' })).resolves.toBeUndefined();
        expect(__mock.send).not.toHaveBeenCalled();
    });
});
