import { Module } from '@nestjs/common';
import { BuyListModule } from 'src/core/buy-list/buy-list.module';
import { ImportModule } from 'src/core/import/import.module';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { DeckBuildabilityService } from './deck-buildability.service';
import { DeckImportService } from './deck-import.service';
import { DeckService } from './deck.service';

@Module({
    imports: [DatabaseModule, ImportModule, BuyListModule],
    providers: [DeckService, DeckImportService, DeckBuildabilityService],
    exports: [DeckService, DeckImportService, DeckBuildabilityService],
})
export class DeckModule {
    private readonly LOGGER = getLogger(DeckModule.name);

    constructor() {
        this.LOGGER.log('Initialized');
    }
}
