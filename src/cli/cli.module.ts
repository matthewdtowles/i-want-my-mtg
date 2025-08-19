import { Logger, Module } from "@nestjs/common";
import { CommandModule } from "nestjs-command";
import { AppModule } from "src/app.module";
import { CoreCliModule } from "./core/core.cli.module";

@Module({
    imports: [AppModule, CommandModule, CoreCliModule,]
})
export class CliModule {
    private readonly LOGGER: Logger = new Logger(CliModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
