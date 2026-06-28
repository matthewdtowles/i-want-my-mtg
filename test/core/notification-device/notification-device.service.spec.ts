import { Test, TestingModule } from '@nestjs/testing';
import { NotificationDevice } from 'src/core/notification-device/notification-device.entity';
import { NotificationDeviceRepositoryPort } from 'src/core/notification-device/ports/notification-device.repository.port';
import { NotificationDeviceService } from 'src/core/notification-device/notification-device.service';

describe('NotificationDeviceService', () => {
    let service: NotificationDeviceService;
    let repository: jest.Mocked<NotificationDeviceRepositoryPort>;

    beforeEach(async () => {
        repository = {
            upsertByToken: jest
                .fn()
                .mockImplementation(async (d: NotificationDevice) => new NotificationDevice({ ...d, id: 1 })),
            deleteByToken: jest.fn().mockResolvedValue(true),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationDeviceService,
                { provide: NotificationDeviceRepositoryPort, useValue: repository },
            ],
        }).compile();
        service = module.get(NotificationDeviceService);
    });

    describe('register', () => {
        it('upserts the trimmed token for the user', async () => {
            const result = await service.register(7, '  expo-token  ', 'ios', '  dev-1  ');
            const stored = repository.upsertByToken.mock.calls[0][0];
            expect(stored.userId).toBe(7);
            expect(stored.token).toBe('expo-token');
            expect(stored.platform).toBe('ios');
            expect(stored.deviceId).toBe('dev-1');
            expect(result.id).toBe(1);
        });

        it('normalizes a blank device id to null', async () => {
            await service.register(7, 'tok', 'android', '   ');
            expect(repository.upsertByToken.mock.calls[0][0].deviceId).toBeNull();
        });
    });

    describe('unregister', () => {
        it('deletes the trimmed token scoped to the user', async () => {
            const result = await service.unregister(7, '  tok  ');
            expect(repository.deleteByToken).toHaveBeenCalledWith('tok', 7);
            expect(result).toBe(true);
        });

        it('returns false when nothing was deleted', async () => {
            repository.deleteByToken.mockResolvedValueOnce(false);
            expect(await service.unregister(7, 'tok')).toBe(false);
        });
    });
});
