import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";

@Injectable()
export class InventoryCli {
    private readonly LOGGER: Logger = new Logger(InventoryCli.name);

    constructor(@Inject(InventoryServicePort) private readonly service: InventoryServicePort) { }

    @Command({
        command: "inventory:save <user> <card> <quantity> <isFoil>",
        describe: "save inventory item",
    })
    async save(
        @Positional({ name: "user" }) _user: number,
        @Positional({ name: "card" }) _card: number,
        @Positional({ name: "quantity" }) _quantity: number,
        @Positional({ name: "isFoil" }) _isFoil: boolean = false,
    ): Promise<boolean> {
        const updateDto: InventoryDto = {
            userId: _user,
            cardId: _card,
            quantity: _quantity,
            isFoil: _isFoil,
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
        const inventory: InventoryDto[] = await this.service.findAllCardsForUser(_user);
        this.LOGGER.log(`${JSON.stringify(inventory, null, 4)}`);
    }
}
