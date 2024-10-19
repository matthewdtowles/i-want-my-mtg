import { Logger, Module } from "@nestjs/common";
import { AppModule } from "../app.module";
import { CommandModule } from "nestjs-command";
import { IngestionCliModule } from "./ingestion/ingestion.cli.module";
import { CoreCliModule } from "./core/core.cli.module";

@Module({
  imports: [AppModule, CommandModule, CoreCliModule, IngestionCliModule],
})
export class CliModule {
  private readonly LOGGER: Logger = new Logger(CliModule.name);

  constructor() {
    this.LOGGER.debug(`Initialized`);
  }
}
