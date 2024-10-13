import { Inject, Injectable, Logger } from "@nestjs/common";
import { CardDto } from "../card/dto/card.dto";
import { CreateCardDto } from "../card/dto/create-card.dto";
import { CardServicePort } from "../card/ports/card.service.port";
import { CreateSetDto } from "../set/dto/create-set.dto";
import { SetDto } from "../set/dto/set.dto";
import { SetServicePort } from "../set/ports/set.service.port";
import { IngestionServicePort } from "./ingestion.service.port";

@Injectable()
export class IngestionOrchestrator {
  private readonly LOGGER: Logger = new Logger(IngestionOrchestrator.name);

  constructor(
    @Inject(IngestionServicePort)
    private readonly ingestionService: IngestionServicePort,
    @Inject(CardServicePort) private readonly cardService: CardServicePort,
    @Inject(SetServicePort) private readonly setService: SetServicePort,
  ) {
    this.LOGGER.debug("Initialized");
  }

  async ingestAllSetMeta(): Promise<SetDto[]> {
    this.LOGGER.debug(`ingestAllSetMeta`);
    const setMeta: CreateSetDto[] =
      (await this.ingestionService.fetchAllSetsMeta()) ?? [];
    const savedSets: SetDto[] = await this.setService.save(setMeta);
    this.LOGGER.log(`Saved Sets size: ${savedSets.length}`);
    if (savedSets) {
      this.LOGGER.log(
        `Saved Sets: ${savedSets.forEach((ss) => {
          ss.name;
        })}`,
      );
    }
    return savedSets;
  }

  async ingestAllSetCards(): Promise<SetDto[]> {
    this.LOGGER.debug(`ingestAllSetCards`);
    const sets: SetDto[] = await this.setService.findAll();
    for (let i = 0; i < sets.length; i++) {
      const cards: CardDto[] = await this.ingestSetCards(sets[i].code);
      for (let j = 0; j < cards.length; j++) {
        sets[i].cards.push(cards[j]);
      }
    }
    return sets;
  }

  async ingestSetCards(code: string): Promise<CardDto[]> {
    this.LOGGER.debug(`ingestSetCards for set code: ${code}`);
    const cards: CreateCardDto[] =
      await this.ingestionService.fetchSetCards(code);
    const savedCards: CardDto[] = await this.cardService.save(cards);
    this.LOGGER.log(`Saved ${savedCards.length} cards in set ${code}`);
    return savedCards;
  }
}
