import { Logger, Module } from "@nestjs/common";
import { SetRepositoryPort, SetService } from "src/core/set";

@Module({
    imports: [],
    providers: [SetService],
    exports: [SetService, SetRepositoryPort]
})
export class SetModule {
    private readonly LOGGER: Logger = new Logger(SetModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
