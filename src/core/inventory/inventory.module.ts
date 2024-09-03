import { Logger, Module } from '@nestjs/common';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { InventoryRepository } from 'src/adapters/database/inventory.repository';
import { InventoryMapper } from './inventory.mapper';
import { InventoryService } from './inventory.service';
import { InventoryRepositoryPort } from './ports/inventory.repository.port';
import { InventoryServicePort } from './ports/inventory.service.port';

@Module({
    imports: [
        DatabaseModule
    ],
    providers: [
        {
            provide: InventoryServicePort,
            useClass: InventoryService,
        },
        {
            provide: InventoryRepositoryPort,
            useClass: InventoryRepository,
        },
        InventoryMapper
    ],
    exports: [
        InventoryRepositoryPort,
        InventoryServicePort,
        InventoryMapper,
    ]
})
export class InventoryModule {
    private readonly LOGGER: Logger = new Logger(InventoryModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}