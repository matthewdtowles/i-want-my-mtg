import { Inject, Injectable, Logger } from "@nestjs/common";
import { Command, Positional } from "nestjs-command";
import { CardDto } from "src/core/card/dto/card.dto";
import { IngestionOrchestratorPort } from "src/core/ingestion/ports/ingestion.orchestrator.port";
import { SetDto } from "src/core/set/dto/set.dto";

@Injectable()
export class IngestionCli {
  private readonly LOGGER: Logger = new Logger(IngestionCli.name);

  constructor(
    @Inject(IngestionOrchestratorPort)
    private readonly orchestrator: IngestionOrchestratorPort,
  ) { }

  @Command({
    command: "ingest:all-sets",
    describe: "Ingest all set meta for every set from external API",
  })
  async ingestAllSetMeta(): Promise<SetDto[]> {
    this.LOGGER.debug(`ingestAllSetMeta invoked`);
    return await this.orchestrator.ingestAllSetMeta();
  }

  @Command({
    command: "ingest:cards <code>",
    describe: "Ingest all cards in set from external API",
  })
  async ingestSetCards(
    @Positional({
      name: "code",
      describe: "the set code",
      type: "string",
    })
    code: string,
  ): Promise<CardDto[]> {
    this.LOGGER.debug(`ingestSetCards invoked with code: ${code}`);
    return await this.orchestrator.ingestSetCards(code);
  }

  @Command({
    command: "ingest:all-cards",
    describe: "Ingest all cards in all sets",
  })
  async ingestAllCards(): Promise<SetDto[]> {
    this.LOGGER.debug(`ingestAllCards for every set invoked`);
    return await this.orchestrator.ingestAllSetCards();
  }

  @Command({
    command: "ingest:test <input>",
    describe: "Ingest test with arguments",
  })
  ingestTest(
    @Positional({
      name: "input",
      describe: "the input arg",
      type: "string",
    })
    input: string,
  ): void {
    this.LOGGER.debug(`ingestTest invoked with input: ${input}`);
  }
}
