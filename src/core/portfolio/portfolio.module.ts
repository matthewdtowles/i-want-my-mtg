import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioService } from './portfolio.service';

@Module({
    imports: [DatabaseModule],
    providers: [PortfolioService],
    exports: [PortfolioService],
})
export class PortfolioModule {
    private readonly LOGGER = getLogger(PortfolioModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
