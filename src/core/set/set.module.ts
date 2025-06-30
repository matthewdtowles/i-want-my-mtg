import { Logger, Module } from "@nestjs/common";
import { SetService } from "src/core/set/set.service";
import { DatabaseModule } from "src/infrastructure/database/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [SetService],
    exports: [SetService]
})
export class SetModule {
    private readonly LOGGER: Logger = new Logger(SetModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
