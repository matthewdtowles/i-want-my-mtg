import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { DeckService } from './deck.service';

@Module({
    imports: [DatabaseModule],
    providers: [DeckService],
    exports: [DeckService],
})
export class DeckModule {
    private readonly LOGGER = getLogger(DeckModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
