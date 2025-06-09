import { Logger, Module } from "@nestjs/common";
import { CardMapper } from "src/core/card";
import { SetMapper, SetRepositoryPort, SetService } from "src/core/set";

@Module({
    imports: [],
    providers: [
        SetService,
        SetMapper,
        CardMapper
    ],
    exports: [SetService, SetRepositoryPort, SetMapper]
})
export class SetModule {
    private readonly LOGGER: Logger = new Logger(SetModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
