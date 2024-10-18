import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
  Render,
  UseGuards,
} from "@nestjs/common";
import { CardDto } from "src/core/card/dto/card.dto";
import { UpdateCardDto } from "src/core/card/dto/update-card.dto";
import { CardServicePort } from "src/core/card/ports/card.service.port";
import { Role } from "./auth/roles.decorator";
import { UserRole } from "./auth/user.role";
import { IngestionOrchestratorPort } from "src/core/ingestion/ports/ingestion.orchestrator.port";
import { RolesGuard } from "./auth/roles.guard";

@UseGuards(RolesGuard)
@Controller("card")
export class CardController {
  private readonly LOGGER: Logger = new Logger(CardController.name);

  constructor(
    @Inject(CardServicePort) private readonly cardService: CardServicePort,
    @Inject(IngestionOrchestratorPort) private readonly ingestionOrchestrator: IngestionOrchestratorPort,
  ) {}

  @Get(":setCode")
  @Role(UserRole.Admin)
  @Render("ingestCards")
  async ingestCards(@Param("setCode") setCode: string): Promise<CardDto[]> {
    return [];
    // return await this.ingestionOrchestrator.ingestSetCards(setCode);
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<CardDto> {
    return await this.cardService.findById(Number(id));
  }

  @Patch(":id")
  @Role(UserRole.Admin)
  async update(@Body() updateCardDtos: UpdateCardDto[]) {
    return await this.cardService.save(updateCardDtos);
  }

  @Get(":setCode/:setNumber")
  @Render("card")
  async findSetCard(
    @Param("setCode") setCode: string,
    @Param("setNumber") setNumber: number,
  ): Promise<CardDto> {
    this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
    return await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
  }
}
