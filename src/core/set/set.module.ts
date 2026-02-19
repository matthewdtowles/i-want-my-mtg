import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { SetChecklistService } from './checklist/set-checklist.service';
import { SetService } from './set.service';

@Module({
    imports: [DatabaseModule],
    providers: [SetService, SetChecklistService],
    exports: [SetService, SetChecklistService],
})
export class SetModule {
    private readonly LOGGER = getLogger(SetModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
