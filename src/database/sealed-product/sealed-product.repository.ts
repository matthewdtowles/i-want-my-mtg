import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductRepositoryPort } from 'src/core/sealed-product/ports/sealed-product.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { SealedProductInventoryOrmEntity } from './sealed-product-inventory.orm-entity';
import { SealedProductPriceHistoryOrmEntity } from './sealed-product-price-history.orm-entity';
import { SealedProductMapper } from './sealed-product.mapper';
import { SealedProductOrmEntity } from './sealed-product.orm-entity';

@Injectable()
export class SealedProductRepository implements SealedProductRepositoryPort {
    private readonly LOGGER = getLogger(SealedProductRepository.name);

    constructor(
        @InjectRepository(SealedProductOrmEntity)
        private readonly productRepo: Repository<SealedProductOrmEntity>,
        @InjectRepository(SealedProductInventoryOrmEntity)
        private readonly inventoryRepo: Repository<SealedProductInventoryOrmEntity>,
        @InjectRepository(SealedProductPriceHistoryOrmEntity)
        private readonly priceHistoryRepo: Repository<SealedProductPriceHistoryOrmEntity>
    ) {
        this.LOGGER.debug('Instantiated.');
    }

    async findBySetCode(setCode: string, options: SafeQueryOptions): Promise<SealedProduct[]> {
        this.LOGGER.debug(`findBySetCode(${setCode})`);
        const items = await this.productRepo.find({
            where: { setCode },
            relations: ['price'],
            order: { name: 'ASC' },
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        });
        return items.map(SealedProductMapper.toCore);
    }

    async totalBySetCode(setCode: string): Promise<number> {
        this.LOGGER.debug(`totalBySetCode(${setCode})`);
        return await this.productRepo.count({ where: { setCode } });
    }

    async findByUuid(uuid: string): Promise<SealedProduct | null> {
        this.LOGGER.debug(`findByUuid(${uuid})`);
        const item = await this.productRepo.findOne({
            where: { uuid },
            relations: ['price'],
        });
        return item ? SealedProductMapper.toCore(item) : null;
    }

    async findPriceHistory(
        uuid: string,
        days?: number
    ): Promise<{ price: number; date: string }[]> {
        this.LOGGER.debug(`findPriceHistory(${uuid}, days=${days})`);
        const qb = this.priceHistoryRepo
            .createQueryBuilder('sph')
            .select(['sph.price', 'sph.date'])
            .where('sph.sealedProductUuid = :uuid', { uuid })
            .orderBy('sph.date', 'ASC');
        if (days) {
            qb.andWhere("sph.date >= CURRENT_DATE - :days * INTERVAL '1 day'", { days });
        }
        const rows = await qb.getMany();
        return rows.map((r) => ({
            price: r.price != null ? Number(r.price) : null,
            date: r.date,
        }));
    }

    async findInventoryForUser(
        userId: number,
        options: SafeQueryOptions
    ): Promise<SealedProductInventory[]> {
        this.LOGGER.debug(`findInventoryForUser(${userId})`);
        const items = await this.inventoryRepo.find({
            where: { userId },
            relations: ['sealedProduct', 'sealedProduct.price'],
            order: { sealedProduct: { name: 'ASC' } },
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        });
        return items.map(SealedProductMapper.inventoryToCore);
    }

    async totalInventoryForUser(userId: number): Promise<number> {
        this.LOGGER.debug(`totalInventoryForUser(${userId})`);
        return await this.inventoryRepo.count({ where: { userId } });
    }

    async findInventoryItem(
        uuid: string,
        userId: number
    ): Promise<SealedProductInventory | null> {
        this.LOGGER.debug(`findInventoryItem(${uuid}, ${userId})`);
        const item = await this.inventoryRepo.findOne({
            where: { sealedProductUuid: uuid, userId },
            relations: ['sealedProduct'],
        });
        return item ? SealedProductMapper.inventoryToCore(item) : null;
    }

    async saveInventory(item: SealedProductInventory): Promise<SealedProductInventory> {
        this.LOGGER.debug(`saveInventory(${item.sealedProductUuid}, user=${item.userId})`);
        const orm = SealedProductMapper.inventoryToOrmEntity(item);
        const saved = await this.inventoryRepo.save(orm);
        return SealedProductMapper.inventoryToCore(saved);
    }

    async deleteInventory(uuid: string, userId: number): Promise<boolean> {
        this.LOGGER.debug(`deleteInventory(${uuid}, user=${userId})`);
        const result = await this.inventoryRepo.delete({
            sealedProductUuid: uuid,
            userId,
        });
        return result.affected > 0;
    }
}
