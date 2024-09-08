import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { InventoryDto } from "src/core/inventory/dto/inventory.dto";
import { UpdateInventoryDto } from "src/core/inventory/dto/update-inventory.dto";
import { InventoryServicePort } from "src/core/inventory/ports/inventory.service.port";

@Injectable()
export class InventoryCli {

    private readonly LOGGER: Logger = new Logger(InventoryCli.name);

    constructor(
        @Inject(InventoryServicePort) private readonly service: InventoryServicePort
    ) { }


/*  @Option({
      name: 'name',
      describe: 'The name of the user',
      type: 'string',
      demandOption: true, // this makes it a required flag
    }) name: string,  ...
    
    // USAGE:

    npm run create:user --name "John Doe"
    */

    @Command({
        command: 'inventory:save <user> <card> <quantity>',
        describe: 'save inventory item with given quantity for given user ID & card ID'
    })
    async save(
        @Positional({name: 'user' }) _user: number,
        @Positional({name: 'card' }) _card: number,
        @Positional({name: 'quantity'}) _quantity: number
    ): Promise<boolean> {
        const updateDto: UpdateInventoryDto = {
            userId: _user,
            cardId: _card,
            quantity: _quantity
        };
        const savedInventory: InventoryDto[] = await this.service.save([updateDto]);
        this.LOGGER.log(`${JSON.stringify(savedInventory, null, 4)}`);
        return true;
    }

    @Command({
        command: 'inventory:get <user>',
        describe: 'retrieve user inventory'
    })
    async getUserInventory(@Positional({name: 'user'}) _user: number): Promise<void> {
        const inventory: InventoryDto[] = await this.service.findByUser(_user);
        this.LOGGER.log(`${JSON.stringify(inventory, null, 4)}`);
    }

    @Command({
        command: 'inventory:remove <user> <card>',
        describe: 'remove inventory item'
    })
    async remove(
        @Positional({name: 'user'}) _user: number,
        @Positional({name: 'card'}) _card: number
    ): Promise<void> {
        const inventoryItem: UpdateInventoryDto = {
            userId: _user,
            cardId: _card,
        };
        await this.service.remove([inventoryItem]);
        this.LOGGER.log(`remove completed`);
    }
    
}