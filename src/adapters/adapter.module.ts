import { Logger, Module } from "@nestjs/common";
import { HttpModule } from "./http/http.module";

@Module({
    imports: [HttpModule],
    exports: [HttpModule]
})
export class AdapterModule {
    private readonly LOGGER: Logger = new Logger(AdapterModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
