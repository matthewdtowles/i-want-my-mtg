import { Logger, Module } from "@nestjs/common";
import { CardModule } from "src/core/card/card.module";
import { InventoryModule } from "src/core/inventory/inventory.module";
import { SetModule } from "src/core/set/set.module";
import { CardServicePort } from "../card/api/card.service.port";
import { CardService } from "../card/card.service";
import { InventoryServicePort } from "../inventory/api/inventory.service.port";
import { InventoryService } from "../inventory/inventory.service";
import { SetServicePort } from "../set/api/set.service.port";
import { SetService } from "../set/set.service";
import { AggregatorService } from "./aggregator.service";
import { AggregatorServicePort } from "./api/aggregator.service.port";

@Module({
    imports: [CardModule, InventoryModule, SetModule],
    providers: [
        { provide: AggregatorServicePort, useClass: AggregatorService },
        { provide: CardServicePort, useClass: CardService },
        { provide: InventoryServicePort, useClass: InventoryService },
        { provide: SetServicePort, useClass: SetService }
    ],
    exports: [AggregatorServicePort],
})
export class AggregatorModule {
    private readonly LOGGER: Logger = new Logger(AggregatorModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}