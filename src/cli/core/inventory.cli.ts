import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { InventoryCardDto, InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";

@Injectable()
export class InventoryCli {
    private readonly LOGGER: Logger = new Logger(InventoryCli.name);

    constructor(@Inject(InventoryServicePort) private readonly service: InventoryServicePort) { }

    @Command({
        command: "inventory:save <user> <card> <quantity>",
        describe: "save inventory item",
    })
    async save(
        @Positional({ name: "user" }) _user: number,
        @Positional({ name: "card" }) _card: number,
        @Positional({ name: "quantity" }) _quantity: number,
    ): Promise<boolean> {
        const updateDto: InventoryDto = {
            userId: _user,
            cardId: _card,
            quantity: _quantity,
        };
        const savedInventory: InventoryDto[] = await this.service.update([updateDto]);
        this.LOGGER.log(`${JSON.stringify(savedInventory, null, 4)}`);
        return true;
    }

    @Command({
        command: "inventory:get <user>",
        describe: "retrieve user inventory",
    })
    async getUserInventory(@Positional({ name: "user" }) _user: number,): Promise<void> {
        const inventory: InventoryCardDto[] = await this.service.findAllCardsForUser(_user);
        this.LOGGER.log(`${JSON.stringify(inventory, null, 4)}`);
    }

    @Command({
        command: "test:inventory:save <user> <card> <quantity> <times>",
        describe: "test save inventory the amount of times specified",
    })
    async testSave(
        @Positional({ name: "user" }) _user: number,
        @Positional({ name: "card" }) _card: number,
        @Positional({ name: "quantity" }) _quantity: number,
        @Positional({ name: "times" }) _times: number,
    ): Promise<boolean> {
        for (let i = 0; i < _times; i++) {
            const updateDto: InventoryDto = {
                userId: _user,
                cardId: _card,
                quantity: _quantity + i,
            };
            const savedInventory: InventoryDto[] = await this.service.update([
                updateDto,
            ]);
            this.LOGGER.debug(`Inventory service save returned ${savedInventory}`);
        }
        const userInventory: InventoryDto[] = await this.service.findAllForUser(_user);
        if (!userInventory) {
            this.LOGGER.error(`Undefined. Inventory service unable to create entity.`,);
        } else if (userInventory.length === 1) {
            if (userInventory[0].quantity === _quantity + _times - 1) {
                this.LOGGER.log(`Inventory Service can create and update entity correctly.`,);
            } else {
                this.LOGGER.error(`Inventory Service can create. The quantity: ${userInventory[0].quantity}`,);
            }
        } else if (userInventory && userInventory.length > 1) {
            this.LOGGER.error(`Inventory Service inserts a new inventory object when it should update.`,);
        } else {
            this.LOGGER.error(`Empty inventory. Inventory Service unable to create entity.`);
        }
        const inventoryToDelete: InventoryDto[] = [];
        userInventory.forEach(item => {
            inventoryToDelete.push({
                userId: item.userId,
                cardId: item.cardId,
                quantity: 0,
            });
        });
        await this.service.update(inventoryToDelete); // cleanup
        const remainingInventory: InventoryDto[] =
            await this.service.findAllForUser(_user);
        this.LOGGER.log(
            `Remaining is: (should be empty after this)${remainingInventory}`,
        );
        return true;
    }
}
