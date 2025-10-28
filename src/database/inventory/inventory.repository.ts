import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { BaseRepository } from "src/database/base.repository";
import { getLogger } from "src/logger/global-app-logger";
import { In, Repository } from "typeorm";
import { InventoryMapper } from "./inventory.mapper";
import { InventoryOrmEntity } from "./inventory.orm-entity";

@Injectable()
export class InventoryRepository extends BaseRepository<InventoryOrmEntity> implements InventoryRepositoryPort {

    readonly TABLE = "inventory";
    private readonly LOGGER = getLogger(InventoryRepository.name);

    constructor(@InjectRepository(InventoryOrmEntity) protected readonly repository: Repository<InventoryOrmEntity>) {
        super();
        this.LOGGER.debug(`Instantiated.`);
    }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`Saving ${inventoryItems?.length ?? 0} inventory items.`);
        const ormItems: InventoryOrmEntity[] = inventoryItems.map((item: Inventory) => InventoryMapper.toOrmEntity(item));
        const saved = await this.repository.save(ormItems);
        const count = saved?.length ?? 0;
        this.LOGGER.debug(`Saved ${count} inventory items.`);
        return saved.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findOne(userId: number, cardId: string, isFoil: boolean): Promise<Inventory | null> {
        this.LOGGER.debug(`Finding inventory item for userId: ${userId}, cardId: ${cardId}, isFoil: ${isFoil}.`);
        const item: InventoryOrmEntity = await this.repository.findOne({
            where: { userId, cardId, isFoil },
        });
        this.LOGGER.debug(`Inventory item ${item ? "found" : "not found"} for userId: ${userId}, cardId: ${cardId}, isFoil: ${isFoil}.`);
        return item ? InventoryMapper.toCore(item) : null;
    }

    async findByCard(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}, cardId: ${cardId}.`);
        const items = await this.repository.find({
            where: { userId, cardId },
        });
        this.LOGGER.debug(`Found ${items.length} inventory items for userId: ${userId}, cardId: ${cardId}.`);
        return items.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findByCards(userId: number, cardIds: string[]): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}, ${cardIds.length} cardIds.`);
        const items = await this.repository.find({
            where: { userId, cardId: In(cardIds) },
        });
        this.LOGGER.debug(`Found ${items.length} inventory items for userId: ${userId}, ${cardIds.length} cardIds.`);
        return items.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findByUser(userId: number, options: SafeQueryOptions): Promise<Inventory[]> {
        this.LOGGER.debug(`Finding inventory items for userId: ${userId}, page: ${options.page}, limit: ${options.limit}, filter: ${options.filter}.`);
        const qb = this.repository.createQueryBuilder("inventory")
            .leftJoinAndSelect(`${this.TABLE}.card`, "card")
            .leftJoinAndSelect("card.prices", "prices")
            .where(`${this.TABLE}.userId = :userId`, { userId });
        this.addFilters(qb, options.filter);
        this.addPagination(qb, options);
        this.addOrdering(qb, options, SortOptions.NUMBER);
        const results = await qb.getMany();
        this.LOGGER.debug(`Found ${results.length} inventory items for userId: ${userId}.`);
        return results.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async totalInventoryCards(userId: number, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting total inventory items for userId: ${userId}, filter: ${options.filter}.`);
        const qb = this.repository.createQueryBuilder(this.TABLE)
            .leftJoin(`${this.TABLE}.card`, "card")
            .where(`${this.TABLE}.userId = :userId`, { userId });
        this.addFilters(qb, options.filter);
        const count = await qb.getCount();
        this.LOGGER.debug(`Total inventory items for userId: ${userId}: ${count}.`);
        return count;
    }

    async totalInventoryValue(userId: number): Promise<number> {
        this.LOGGER.debug(`Calculate total value for user inventory items.`);
        const totalInventorValue = await this.repository.query(`
            SELECT COALESCE(SUM(
                CASE
                    WHEN i.foil THEN p.foil
                    ELSE p.normal
                END * i.quantity
            ), 0) AS total_value
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            JOIN price p ON p.card_id = c.id
            WHERE i.user_id = $1
            `, [userId]);
        this.LOGGER.debug(`User inventory value: ${totalInventorValue}.`);
        return Number(totalInventorValue[0]?.total_value ?? 0);
    }

    async totalInventoryValueForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Get total value for user inventory items in set: ${setCode}.`);
        const totalinventoryvalue = await this.repository.query(`
             SELECT COALESCE(SUM(
                CASE
                    WHEN i.foil THEN p.foil
                    ELSE p.normal
                END * i.quantity
            ), 0) AS total_value
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            JOIN price p ON p.card_id = c.id
            WHERE i.user_id = $1
            AND c.set_code = $2
            `, [userId, setCode]);
        this.LOGGER.debug(`User inventory value for set ${setCode}: ${totalinventoryvalue}.`);
        return Number(totalinventoryvalue[0]?.total_value ?? 0);
    }

    async totalInventoryCardsForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Counting total inventory items for user ${userId} in set ${setCode}.`);
        const qb = this.repository.createQueryBuilder(this.TABLE)
            .leftJoin(`${this.TABLE}.card`, "card")
            .where(`${this.TABLE}.userId = :userId`, { userId })
            .andWhere(`${this.TABLE}.card = :setCode`, { setCode });
        const count = await qb.getCount();
        this.LOGGER.debug(`Total inventory items for userId: ${userId}: ${count}.`);
        return count;
    }

    async delete(userId: number, cardId: string, foil: boolean): Promise<void> {
        this.LOGGER.debug(`Deleting inventory item for userId: ${userId}, cardId: ${cardId}, foil: ${foil}.`);
        try {
            await this.repository
                .createQueryBuilder()
                .delete()
                .from(InventoryOrmEntity)
                .where("userId = :userId", { userId })
                .andWhere("cardId = :cardId", { cardId })
                .andWhere("foil = :foil", { foil })
                .execute();
            this.LOGGER.debug(`Deleted inventory item for userId: ${userId}, cardId: ${cardId}, foil: ${foil}.`);
        } catch (error) {
            this.LOGGER.error(`Failed to delete inventory item for userId: ${userId}, cardId: ${cardId}, foil: ${foil}. Error: ${error}`);
            throw new Error(`Failed to delete inventory: ${error.message}`);
        }
    }
}
