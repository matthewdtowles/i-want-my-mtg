import { Logger, Module } from "@nestjs/common";
import { IngestionOrchestrator } from "./ingestion.orchestrator";
import { IngestionServicePort } from "./ports/ingestion.service.port";
import { MtgJsonIngestionService } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.service";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { CardModule } from "../card/card.module";
import { SetModule } from "../set/set.module";
import { IngestionOrchestratorPort } from "./ports/ingestion.orchestrator.port";

@Module({
  imports: [MtgJsonIngestionModule, CardModule, SetModule],
  providers: [
    {
      provide: IngestionOrchestratorPort,
      useClass: IngestionOrchestrator,
    },
    {
      provide: IngestionServicePort,
      useClass: MtgJsonIngestionService,
    },
  ],
  exports: [IngestionOrchestratorPort],
})
export class IngestionModule {
  private readonly LOGGER: Logger = new Logger(IngestionModule.name);

  constructor() {
    this.LOGGER.debug(`Initialized`);
  }
}
