import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { Inventory } from "src/core/inventory/inventory.entity";

export class MockInventoryRepository implements InventoryRepositoryPort {


    private inventory: Inventory[] = [];

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        if (!inventoryItems || inventoryItems.length === 0) {
            throw new Error("No inventory items provided");
        }
        const savedItems: Inventory[] = [];
        inventoryItems.forEach((item: Inventory) => {
            const existingItemIndex: number = this.inventory.findIndex(i => i.userId === item.userId && i.cardId === item.cardId);
            if (existingItemIndex >= 0) {
                if (item.quantity === 0) {
                    this.inventory.splice(existingItemIndex, 1);
                } else {
                    this.inventory[existingItemIndex] = item;
                    savedItems.push(item);
                }
            } else {
                this.inventory.push(item);
                savedItems.push(item);
            }
        });
        return savedItems;
    }

    async findByCard(userId: number, cardId: string): Promise<Inventory[]> {
        return this.inventory.filter(i => i.userId === userId && i.cardId === cardId);
    }

    async findByUser(userId: number): Promise<Inventory[]> {
        return this.inventory.filter(i => i.userId === userId);
    }

    async findOne(userId: number, cardId: string): Promise<Inventory> {
        return this.inventory.find(i => i.userId === userId && i.cardId === cardId);
    }

    async delete(userId: number, cardId: string): Promise<void> {
        this.inventory = this.inventory.filter(i => i.userId !== userId && i.cardId !== cardId);
    }

    reset(): void {
        this.inventory = [];
    }

    populate(inventoryItems: Inventory[]): void {
        this.inventory = inventoryItems;
    }
}