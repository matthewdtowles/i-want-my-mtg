import { Logger, Module } from "@nestjs/common";
import { CardServicePort } from "../card/api/card.service.port";
import { SetServicePort } from "../set/api/set.service.port";
import { SetService } from "../set/set.service";
import { CardService } from "../card/card.service";
import { InventoryServicePort } from "../inventory/api/inventory.service.port";
import { InventoryService } from "../inventory/inventory.service";
import { AggregatorServicePort } from "./api/aggregator.service.port";
import { AggregatorService } from "./aggregator.service";

@Module({
    providers: [
        {
            provide: AggregatorServicePort,
            useClass: AggregatorService,
        },
        {
            provide: CardServicePort,
            useClass: CardService,
        },
        {
            provide: InventoryServicePort,
            useClass: InventoryService,
        },
        {
            provide: SetServicePort,
            useClass: SetService,
        },
    ],
    exports: [AggregatorServicePort],
})
export class AggregatorModule {
    private readonly LOGGER: Logger = new Logger(AggregatorModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}