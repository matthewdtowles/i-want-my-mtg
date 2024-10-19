import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { MtgJsonIngestionService } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.service";
import { CardModule } from "src/core/card/card.module";
import { IngestionServicePort } from "src/core/ingestion/ports/ingestion.service.port";
import { SetModule } from "src/core/set/set.module";
import { IngestionCli } from "./ingestion.cli";
import { IngestionModule } from "src/core/ingestion/ingestion.module";

@Module({
  imports: [
    MtgJsonIngestionModule,
    SetModule,
    CardModule,
    IngestionModule,
  ],
  providers: [
    IngestionCli,
    {
      provide: IngestionServicePort,
      useClass: MtgJsonIngestionService,
    },
  ],
  exports: [IngestionCli],
})
export class IngestionCliModule {
  private readonly LOGGER: Logger = new Logger(IngestionCliModule.name);

  constructor() {
    this.LOGGER.debug(`Initialized`);
  }
}
