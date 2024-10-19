import { Logger, Module } from "@nestjs/common";
import { SetRepository } from "src//adapters/database/set.repository";
import { DatabaseModule } from "src/adapters/database/database.module";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { SetRepositoryPort } from "./ports/set.repository.port";
import { SetServicePort } from "./ports/set.service.port";
import { SetService } from "./set.service";
import { SetMapper } from "./set.mapper";
import { CardMapper } from "../card/card.mapper";

@Module({
  imports: [DatabaseModule, MtgJsonIngestionModule],
  providers: [
    {
      provide: SetServicePort,
      useClass: SetService,
    },
    {
      provide: SetRepositoryPort,
      useClass: SetRepository,
    },
    SetMapper,
    CardMapper,
  ],
  exports: [SetServicePort, SetRepositoryPort, SetMapper],
})
export class SetModule {
  private readonly LOGGER: Logger = new Logger(SetModule.name);

  constructor() {
    this.LOGGER.debug(`Initialized`);
  }
}
