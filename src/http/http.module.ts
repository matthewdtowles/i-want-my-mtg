import { Module } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiModule } from './api/api.module';
import { HbsModule } from './hbs/hbs.module';

@Module({
    imports: [HbsModule, ApiModule],
    exports: [HbsModule],
})
export class HttpModule {
    private readonly LOGGER = getLogger(HttpModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
