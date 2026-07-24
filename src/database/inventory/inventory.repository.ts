import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryRepositoryPort } from 'src/core/inventory/ports/inventory.repository.port';
import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { INVENTORY_SORTS, SortOptions } from 'src/core/query/sort-options.enum';
import { QueryBuilderHelper } from 'src/database/query/query-builder.helper';
import { activeEntityManager } from 'src/database/transaction-runner';
import { getLogger } from 'src/logger/global-app-logger';
import { latestPriceCondition } from 'src/database/query/latest-price.sql';
import { In, Repository } from 'typeorm';
import { InventoryMapper } from './inventory.mapper';
import { InventoryOrmEntity } from './inventory.orm-entity';

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {
    readonly TABLE = 'inventory';
    private readonly LOGGER = getLogger(InventoryRepository.name);

    private readonly queryHelper = new QueryBuilderHelper<InventoryOrmEntity>({
        table: this.TABLE,
        filterColumn: 'card.name', // Inventory filters by card name
        defaultSort: SortOptions.NUMBER,
        allowedSorts: INVENTORY_SORTS,
    });

    constructor(
        @InjectRepository(InventoryOrmEntity)
        protected readonly repository: Repository<InventoryOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    /**
     * The repository bound to the active transaction (W2/B4) when one is open,
     * otherwise the default. Mutations and the locking read below go through
     * this so ledger + inventory writes commit atomically.
     */
    private repo(): Repository<InventoryOrmEntity> {
        return activeEntityManager()?.getRepository(InventoryOrmEntity) ?? this.repository;
    }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`Saving ${inventoryItems?.length ?? 0} inventory items.`);
        const ormItems: InventoryOrmEntity[] = inventoryItems.map((item: Inventory) =>
            InventoryMapper.toOrmEntity(item)
        );
        const saved = await this.repo().save(ormItems);
        this.LOGGER.debug(`Saved ${saved?.length ?? 0} inventory items.`);
        return saved.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findOne(userId: number, cardId: string, isFoil: boolean): Promise<Inventory | null> {
        this.LOGGER.debug(
            `Finding inventory item for userId: ${userId}, cardId: ${cardId}, isFoil: ${isFoil}.`
        );
        const item: InventoryOrmEntity = await this.repo().findOne({
            where: { userId, cardId, isFoil },
        });
        this.LOGGER.debug(`Inventory item ${item ? 'found' : 'not found'}.`);
        return item ? InventoryMapper.toCore(item) : null;
    }

    async findOneForUpdate(
        userId: number,
        cardId: string,
        isFoil: boolean
    ): Promise<Inventory | null> {
        this.LOGGER.debug(
            `Locking inventory row for userId: ${userId}, cardId: ${cardId}, isFoil: ${isFoil}.`
        );
        // Serialization point for the ledger money path (W2/B4): concurrent
        // mutations to the same holding block here, so the remaining-quantity
        // check the caller runs next sees committed prior writes (closes the
        // oversell race). Requires an open transaction (see TransactionRunner).
        const item = await this.repo()
            .createQueryBuilder(this.TABLE)
            .setLock('pessimistic_write')
            .where(`${this.TABLE}.userId = :userId`, { userId })
            .andWhere(`${this.TABLE}.cardId = :cardId`, { cardId })
            .andWhere(`${this.TABLE}.isFoil = :isFoil`, { isFoil })
            .getOne();
        return item ? InventoryMapper.toCore(item) : null;
    }

    async findByCard(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}, cardId: ${cardId}.`);
        const items = await this.repo().find({ where: { userId, cardId } });
        this.LOGGER.debug(`Found ${items.length} inventory items.`);
        return items.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findByCards(userId: number, cardIds: string[]): Promise<Inventory[]> {
        this.LOGGER.debug(
            `Finding inventory items for userId: ${userId}, ${cardIds.length} cardIds.`
        );
        const items = await this.repository.find({ where: { userId, cardId: In(cardIds) } });
        this.LOGGER.debug(`Found ${items.length} inventory items.`);
        return items.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findByUser(userId: number, options: SafeQueryOptions): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.card`, 'card')
            .leftJoinAndSelect(
                'card.prices',
                'prices',
                latestPriceCondition('prices', 'card')
            )
            .leftJoinAndSelect('card.set', 'set')
            .where(`${this.TABLE}.userId = :userId`, { userId });

        if (options.baseOnly) {
            qb.andWhere('card.inMain = :inMain', { inMain: true });
        }
        if (options.finish) {
            qb.andWhere(`${this.TABLE}.isFoil = :isFoil`, { isFoil: options.finish === 'foil' });
        }

        this.queryHelper.applyOptions(qb, options);
        const results = await qb.getMany();
        this.LOGGER.debug(`Found ${results.length} inventory items for userId: ${userId}.`);
        return results.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async totalInventoryCards(userId: number, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting total inventory items for userId: ${userId}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoin(`${this.TABLE}.card`, 'card')
            .where(`${this.TABLE}.userId = :userId`, { userId });

        if (options.baseOnly) {
            qb.andWhere('card.inMain = :inMain', { inMain: true });
        }
        // Mirror findByUser's finish clause so meta.total matches the rows served.
        if (options.finish) {
            qb.andWhere(`${this.TABLE}.isFoil = :isFoil`, { isFoil: options.finish === 'foil' });
        }

        this.queryHelper.applyFilters(qb, options.filter);
        const count = await qb.getCount();
        this.LOGGER.debug(`Total inventory items for userId: ${userId}: ${count}.`);
        return count;
    }

    async totalInventoryValue(userId: number): Promise<number> {
        this.LOGGER.debug(`Calculate total value for user inventory items.`);
        const queryResult = await this.repository.query(
            `
            SELECT COALESCE(SUM(
                ${PriceCalculationPolicy.inventoryItemValueExpression()} * i.quantity
            ), 0) AS total_value
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            LEFT JOIN price p ON p.card_id = c.id
                AND ${latestPriceCondition('p', 'c')}
            WHERE i.user_id = $1
            `,
            [userId]
        );
        const totalValue = Number(queryResult[0]?.total_value ?? 0);
        this.LOGGER.debug(`User inventory value: ${totalValue}.`);
        return totalValue;
    }

    async totalInventoryValueForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Get total value for user inventory items in set: ${setCode}.`);
        const queryResult = await this.repository.query(
            `
            SELECT COALESCE(SUM(
                ${PriceCalculationPolicy.inventoryItemValueExpression()} * i.quantity
            ), 0) AS total_value
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            LEFT JOIN price p ON p.card_id = c.id
                AND ${latestPriceCondition('p', 'c')}
            WHERE i.user_id = $1
            AND c.set_code = $2
            `,
            [userId, setCode]
        );
        const totalValue = Number(queryResult[0]?.total_value ?? 0);
        this.LOGGER.debug(`User inventory value for set ${setCode}: ${totalValue}.`);
        return totalValue;
    }

    async totalInventoryCardsForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Counting total inventory items for user ${userId} in set ${setCode}.`);
        const queryResult = await this.repository.query(
            `
            SELECT COUNT(DISTINCT i.card_id) AS total
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            WHERE i.user_id = $1
            AND c.set_code = $2
            `,
            [userId, setCode]
        );
        const count = Number(queryResult[0]?.total ?? 0);
        this.LOGGER.debug(
            `Total inventory items for userId: ${userId} in set ${setCode} is ${count}.`
        );
        return count;
    }

    async totalInventoryCardsForSets(
        userId: number,
        setCodes: string[]
    ): Promise<Map<string, number>> {
        this.LOGGER.debug(
            `Counting total inventory items for user ${userId} across ${setCodes.length} sets.`
        );
        if (setCodes.length === 0) return new Map();

        const placeholders = setCodes.map((_, i) => `$${i + 2}`).join(', ');
        const queryResult = await this.repository.query(
            `
            SELECT c.set_code, COUNT(DISTINCT i.card_id) AS total
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            WHERE i.user_id = $1
            AND c.set_code IN (${placeholders})
            GROUP BY c.set_code
            `,
            [userId, ...setCodes]
        );

        const map = new Map<string, number>();
        for (const row of queryResult) {
            map.set(row.set_code, Number(row.total));
        }
        return map;
    }

    async totalInventoryValuesForSets(
        userId: number,
        setCodes: string[]
    ): Promise<Map<string, number>> {
        this.LOGGER.debug(
            `Getting inventory values for user ${userId} across ${setCodes.length} sets.`
        );
        if (setCodes.length === 0) return new Map();

        const placeholders = setCodes.map((_, i) => `$${i + 2}`).join(', ');
        const queryResult = await this.repository.query(
            `
            SELECT c.set_code, COALESCE(SUM(
                ${PriceCalculationPolicy.inventoryItemValueExpression()} * i.quantity
            ), 0) AS total_value
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            LEFT JOIN price p ON p.card_id = c.id
                AND ${latestPriceCondition('p', 'c')}
            WHERE i.user_id = $1
            AND c.set_code IN (${placeholders})
            GROUP BY c.set_code
            `,
            [userId, ...setCodes]
        );

        const map = new Map<string, number>();
        for (const row of queryResult) {
            map.set(row.set_code, Number(row.total_value));
        }
        return map;
    }

    async ensureAtLeastOne(
        items: Array<{ cardId: string; userId: number; isFoil: boolean }>
    ): Promise<{ saved: number; skipped: number }> {
        this.LOGGER.debug(`ensureAtLeastOne for ${items.length} items.`);
        if (items.length === 0) return { saved: 0, skipped: 0 };

        const values = items
            .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3}, 1)`)
            .join(', ');
        const params = items.flatMap((item) => [item.cardId, item.userId, item.isFoil]);

        // RETURNING makes query() resolve to one row per *actually inserted*
        // row; ON CONFLICT DO NOTHING omits conflicting rows. The raw result is
        // a rows array with no rowCount, so count its length (W2/B2).
        const result = await this.repo().query(
            `INSERT INTO inventory (card_id, user_id, foil, quantity)
             VALUES ${values}
             ON CONFLICT (card_id, user_id, foil) DO NOTHING
             RETURNING card_id`,
            params
        );
        const saved = Array.isArray(result) ? result.length : 0;
        const skipped = items.length - saved;
        this.LOGGER.debug(`ensureAtLeastOne: saved ${saved}, skipped ${skipped}.`);
        return { saved, skipped };
    }

    async findAllForExport(userId: number): Promise<Inventory[]> {
        this.LOGGER.debug(`findAllForExport for userId: ${userId}.`);
        const items = await this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.card`, 'card')
            .where(`${this.TABLE}.userId = :userId`, { userId })
            .orderBy('card.setCode', 'ASC')
            .addOrderBy('card.sortNumber', 'ASC')
            .getMany();
        this.LOGGER.debug(`Found ${items.length} items for export.`);
        return items.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async delete(userId: number, cardId: string, foil: boolean): Promise<void> {
        this.LOGGER.debug(
            `Deleting inventory item for userId: ${userId}, cardId: ${cardId}, foil: ${foil}.`
        );
        try {
            await this.repo()
                .createQueryBuilder()
                .delete()
                .from(InventoryOrmEntity)
                .where('userId = :userId', { userId })
                .andWhere('cardId = :cardId', { cardId })
                .andWhere('foil = :foil', { foil })
                .execute();
            this.LOGGER.debug(`Deleted inventory item.`);
        } catch (error) {
            this.LOGGER.error(`Failed to delete inventory item. Error: ${error}`);
            throw new Error(`Failed to delete inventory: ${error.message}`);
        }
    }
}
