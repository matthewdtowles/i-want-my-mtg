import { Inject, Injectable } from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { getLogger } from 'src/logger/global-app-logger';
import { SealedProductInventory } from './sealed-product-inventory.entity';
import { SealedProduct } from './sealed-product.entity';
import { SealedProductRepositoryPort } from './ports/sealed-product.repository.port';

@Injectable()
export class SealedProductService {
    private readonly LOGGER = getLogger(SealedProductService.name);

    constructor(
        @Inject(SealedProductRepositoryPort)
        private readonly repository: SealedProductRepositoryPort
    ) {}

    async findBySetCode(setCode: string, options: SafeQueryOptions): Promise<SealedProduct[]> {
        this.LOGGER.debug(`findBySetCode(${setCode})`);
        return await this.repository.findBySetCode(setCode, options);
    }

    async totalBySetCode(setCode: string): Promise<number> {
        this.LOGGER.debug(`totalBySetCode(${setCode})`);
        return await this.repository.totalBySetCode(setCode);
    }

    async findByUuid(uuid: string): Promise<SealedProduct | null> {
        this.LOGGER.debug(`findByUuid(${uuid})`);
        return await this.repository.findByUuid(uuid);
    }

    async findPriceHistory(
        uuid: string,
        days?: number
    ): Promise<{ price: number | null; date: string }[]> {
        this.LOGGER.debug(`findPriceHistory(${uuid}, days=${days})`);
        return await this.repository.findPriceHistory(uuid, days);
    }

    async findInventoryForUser(
        userId: number,
        options: SafeQueryOptions
    ): Promise<SealedProductInventory[]> {
        this.LOGGER.debug(`findInventoryForUser(${userId})`);
        return await this.repository.findInventoryForUser(userId, options);
    }

    async totalInventoryForUser(userId: number): Promise<number> {
        this.LOGGER.debug(`totalInventoryForUser(${userId})`);
        return await this.repository.totalInventoryForUser(userId);
    }

    async findInventoryQuantitiesForUser(
        userId: number,
        uuids: string[]
    ): Promise<Map<string, number>> {
        this.LOGGER.debug(
            `findInventoryQuantitiesForUser(user=${userId}, ${uuids.length} uuids)`
        );
        return await this.repository.findInventoryQuantitiesForUser(userId, uuids);
    }

    async findInventoryItem(
        uuid: string,
        userId: number
    ): Promise<SealedProductInventory | null> {
        this.LOGGER.debug(`findInventoryItem(${uuid}, user=${userId})`);
        return await this.repository.findInventoryItem(uuid, userId);
    }

    async saveInventory(item: SealedProductInventory): Promise<SealedProductInventory | null> {
        this.LOGGER.debug(
            `saveInventory(${item.sealedProductUuid}, user=${item.userId}, qty=${item.quantity})`
        );
        if (item.quantity <= 0) {
            await this.repository.deleteInventory(item.sealedProductUuid, item.userId);
            return null;
        }
        return await this.repository.saveInventory(item);
    }

    async deleteInventory(uuid: string, userId: number): Promise<boolean> {
        this.LOGGER.debug(`deleteInventory(${uuid}, user=${userId})`);
        return await this.repository.deleteInventory(uuid, userId);
    }
}
