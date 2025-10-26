import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { getLogger } from "src/logger/global-app-logger";
import { SetService } from "./set.service";

@Module({
    imports: [DatabaseModule],
    providers: [SetService],
    exports: [SetService]
})
export class SetModule {
    private readonly LOGGER = getLogger(SetModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
