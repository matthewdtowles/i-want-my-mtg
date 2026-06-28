import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationDevice } from 'src/core/notification-device/notification-device.entity';
import { NotificationDeviceRepositoryPort } from 'src/core/notification-device/ports/notification-device.repository.port';
import { Repository } from 'typeorm';
import { NotificationDeviceMapper } from './notification-device.mapper';
import { NotificationDeviceOrmEntity } from './notification-device.orm-entity';

@Injectable()
export class NotificationDeviceRepository implements NotificationDeviceRepositoryPort {
    constructor(
        @InjectRepository(NotificationDeviceOrmEntity)
        private readonly repository: Repository<NotificationDeviceOrmEntity>
    ) {}

    async upsertByToken(device: NotificationDevice): Promise<NotificationDevice> {
        const orm = NotificationDeviceMapper.toOrmEntity(device);
        // Re-registering the same push token updates the existing row (re-points
        // it at the current user, refreshes platform) instead of duplicating it.
        const existing = await this.repository.findOneBy({ token: device.token });
        if (existing) {
            orm.id = existing.id;
        }
        try {
            const saved = await this.repository.save(orm);
            return NotificationDeviceMapper.toCore(saved);
        } catch (err) {
            // A concurrent insert raced past the pre-check; the unique token
            // constraint rejects the loser (23505) — fall back to an update.
            if ((err as { code?: string })?.code === '23505') {
                const current = await this.repository.findOneBy({ token: device.token });
                if (current) {
                    orm.id = current.id;
                    const saved = await this.repository.save(orm);
                    return NotificationDeviceMapper.toCore(saved);
                }
            }
            throw err;
        }
    }

    async deleteByToken(token: string, userId: number): Promise<boolean> {
        const result = await this.repository.delete({ token, userId });
        return (result.affected ?? 0) > 0;
    }
}
