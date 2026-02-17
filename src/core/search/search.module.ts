import { Module } from '@nestjs/common';
import { CardModule } from 'src/core/card/card.module';
import { SetModule } from 'src/core/set/set.module';
import { getLogger } from 'src/logger/global-app-logger';
import { SearchService } from './search.service';

@Module({
    imports: [CardModule, SetModule],
    providers: [SearchService],
    exports: [SearchService],
})
export class SearchModule {
    private readonly LOGGER = getLogger(SearchModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
