import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { CardImportResolver } from './card-import-resolver';

@Module({
    imports: [DatabaseModule],
    providers: [CardImportResolver],
    exports: [CardImportResolver],
})
export class ImportModule {
    private readonly LOGGER = getLogger(ImportModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
