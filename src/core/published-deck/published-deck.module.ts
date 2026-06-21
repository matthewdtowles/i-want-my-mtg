import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PublishedDeckService } from './published-deck.service';

@Module({
    imports: [DatabaseModule],
    providers: [PublishedDeckService],
    exports: [PublishedDeckService],
})
export class PublishedDeckModule {
    private readonly LOGGER = getLogger(PublishedDeckModule.name);

    constructor() {
        this.LOGGER.log('Initialized');
    }
}
