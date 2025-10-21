import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { SetService } from "./set.service";

@Module({
    imports: [DatabaseModule],
    providers: [SetService],
    exports: [SetService]
})
export class SetModule {
    private readonly LOGGER: Logger = new Logger(SetModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
