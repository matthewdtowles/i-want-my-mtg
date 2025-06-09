import { Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory, InventoryRepositoryPort } from "src/core/inventory";


@Injectable()
export class InventoryService {

    private readonly LOGGER: Logger = new Logger(InventoryService.name);

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
    ) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`create ${inventoryItems.length} inventory items`);
        return await this.repository.save(inventoryItems);
    }

    async findForUser(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`findForUser ${userId}, card: ${cardId}`);
        if (userId && cardId) {
            return await this.repository.findByCard(userId, cardId);
        }
        return [];
    }

    async findAllCardsForUser(userId: number): Promise<Inventory[]> {
        this.LOGGER.debug(`findAllCardsForUser ${userId}`);
        if (userId) {
            return await this.repository.findByUser(userId);
        }
        return [];
    }

    async delete(userId: number, cardId: string, isFoil: boolean): Promise<boolean> {
        this.LOGGER.debug(`delete inventory entry for user: ${userId}, card: ${cardId}, foil: ${isFoil}`);
        let result = false;
        if (userId && cardId) {
            try {
                await this.repository.delete(userId, cardId, isFoil);
                const foundItem = await this.repository.findOne(userId, cardId, isFoil);
                if (!foundItem) {
                    result = true;
                }
            }
            catch (error) {
                this.LOGGER.error(`Failed to delete inventory: ${error.message}`);
            }
        }
        return result;
    }
}