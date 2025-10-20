import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { BaseRepository } from "src/database/base.repository";
import { In, Repository } from "typeorm";
import { InventoryMapper } from "./inventory.mapper";
import { InventoryOrmEntity } from "./inventory.orm-entity";

@Injectable()
export class InventoryRepository extends BaseRepository<InventoryOrmEntity> implements InventoryRepositoryPort {

    readonly TABLE = "inventory";
    private readonly LOGGER = new Logger(InventoryRepository.name);

    constructor(@InjectRepository(InventoryOrmEntity) private readonly repository: Repository<InventoryOrmEntity>) {
        super();
    }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`Saving ${inventoryItems.length} inventory items`);
        const ormItems: InventoryOrmEntity[] = inventoryItems.map((item: Inventory) => InventoryMapper.toOrmEntity(item));
        const savedItems: InventoryOrmEntity[] = await this.repository.save(ormItems);
        return savedItems.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findOne(userId: number, cardId: string, isFoil: boolean): Promise<Inventory | null> {
        this.LOGGER.debug(`Finding inventory item for userId: ${userId}, cardId: ${cardId}, isFoil: ${isFoil}`);
        const item: InventoryOrmEntity = await this.repository.findOne({
            where: { userId, cardId, isFoil },
        });
        return item ? InventoryMapper.toCore(item) : null;
    }

    async findByCard(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}, cardId: ${cardId}`);
        const items = await this.repository.find({
            where: { userId, cardId },
        });
        return items.map((item: InventoryOrmEntity) => (InventoryMapper.toCore(item)));
    }

    async findByCards(userId: number, cardIds: string[]): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}, ${cardIds.length} cardIds`);
        const items = await this.repository.find({
            where: { userId, cardId: In(cardIds) },
        });
        return items.map((item: InventoryOrmEntity) => (InventoryMapper.toCore(item)));
    }

    async findByUser(userId: number, options: SafeQueryOptions): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}, page: ${options.page}, limit: ${options.limit}, filter: ${options.filter}`);
        const qb = this.repository.createQueryBuilder("inventory")
            .leftJoinAndSelect(`${this.TABLE}.card`, "card")
            .leftJoinAndSelect("card.prices", "prices")
            .where(`${this.TABLE}.userId = :userId`, { userId });
        this.addFilters(qb, options.filter);
        qb.skip((options.page - 1) * options.limit).take(options.limit);
        options.sort
            ? qb.orderBy(`${options.sort}`, options.ascend ? this.ASC : this.DESC)
            : qb.orderBy(SortOptions.NUMBER, this.ASC);
        return (await qb.getMany()).map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async totalInventoryItemsForUser(userId: number, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting total inventory items for userId: ${userId}, filter: ${options.filter}`);
        const qb = this.repository.createQueryBuilder(this.TABLE)
            .leftJoin(`${this.TABLE}.card`, "card")
            .where(`${this.TABLE}.userId = :userId`, { userId });
        this.addFilters(qb, options.filter);
        return await qb.getCount();
    }

    async delete(userId: number, cardId: string, foil: boolean): Promise<void> {
        this.LOGGER.debug(`Deleting inventory item for userId: ${userId}, cardId: ${cardId}, foil: ${foil}`);
        try {
            await this.repository
                .createQueryBuilder()
                .delete()
                .from(InventoryOrmEntity)
                .where("userId = :userId", { userId })
                .andWhere("cardId = :cardId", { cardId })
                .andWhere("foil = :foil", { foil })
                .execute();
        } catch (error) {
            this.LOGGER.error(`Failed to delete inventory item for userId: ${userId}, cardId: ${cardId}, foil: ${foil}`, error);
            throw new Error(`Failed to delete inventory: ${error.message}`);
        }
        this.LOGGER.debug(`Deleted inventory item for userId: ${userId}, cardId: ${cardId}, foil: ${foil}`);
    }
}
