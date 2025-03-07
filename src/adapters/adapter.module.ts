import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module";
import { HttpModule } from "./http/http.module";
import { MtgJsonIngestionModule } from "./mtgjson-ingestion/mtgjson-ingestion.module";

@Module({
    imports: [DatabaseModule, HttpModule, MtgJsonIngestionModule],
    exports: [DatabaseModule, HttpModule, MtgJsonIngestionModule]
})
export class AdapterModule {
    private readonly LOGGER: Logger = new Logger(AdapterModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
