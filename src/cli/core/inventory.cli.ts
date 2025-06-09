import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { Inventory, InventoryService } from "src/core/inventory";

@Injectable()
export class InventoryCli {
    private readonly LOGGER: Logger = new Logger(InventoryCli.name);

    constructor(@Inject(InventoryService) private readonly service: InventoryService) { }

    @Command({
        command: "inventory:get <user>",
        describe: "retrieve user inventory",
    })
    async getUserInventory(@Positional({ name: "user" }) _user: number,): Promise<void> {
        const inventory: Inventory[] = await this.service.findAllCardsForUser(_user);
        this.LOGGER.log(`${JSON.stringify(inventory, null, 4)}`);
    }
}
