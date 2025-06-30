import { Logger, Module } from "@nestjs/common";
import { HttpModule } from "./http/http.module";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";

// TODO SHOULD MTG JSON INGESTION BE HERE? and removd from APP MODULE?
@Module({
    imports: [HttpModule, MtgJsonIngestionModule],
    exports: [HttpModule, MtgJsonIngestionModule],
})
export class AdapterModule {
    private readonly LOGGER: Logger = new Logger(AdapterModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
