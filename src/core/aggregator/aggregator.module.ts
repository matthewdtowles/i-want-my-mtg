import { Logger, Module } from "@nestjs/common";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { CardModule } from "src/core/card/card.module";
import { CardService } from "src/core/card/card.service";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { InventoryModule } from "src/core/inventory/inventory.module";
import { InventoryService } from "src/core/inventory/inventory.service";
import { SetServicePort } from "src/core/set/api/set.service.port";
import { SetModule } from "src/core/set/set.module";
import { SetService } from "src/core/set/set.service";
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