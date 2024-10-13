import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionService } from "./mtgjson-ingestion.service";
import { MtgJsonIngestionMapper } from "./mtgjson-ingestion.mapper";
import { IngestionServicePort } from "src/core/ingestion/ingestion.service.port";
import { MtgJsonApiClient } from "./mtgjson-api.client";

@Module({
  providers: [
    MtgJsonApiClient,
    MtgJsonIngestionMapper,
    {
      provide: IngestionServicePort,
      useClass: MtgJsonIngestionService,
    },
  ],
  exports: [IngestionServicePort, MtgJsonApiClient, MtgJsonIngestionMapper],
})
export class MtgJsonIngestionModule {
  private readonly LOGGER: Logger = new Logger(MtgJsonIngestionModule.name);

  constructor() {
    this.LOGGER.debug(`Initialized`);
  }
}
