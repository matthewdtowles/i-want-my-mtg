import { Inject, Injectable, Logger } from "@nestjs/common";
import { InventoryServicePort } from "src/core/inventory/ports/inventory.service.port";

@Injectable()
export class InventoryCli {

    private readonly LOGGER: Logger = new Logger(InventoryCli.name);

    constructor(
        @Inject(InventoryServicePort) private readonly service: InventoryServicePort
    ) { }

    
}