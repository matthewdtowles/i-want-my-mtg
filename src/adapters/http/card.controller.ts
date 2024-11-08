import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Param,
    Patch,
    Render, Req, UseGuards
} from "@nestjs/common";
import { BaseHttpDto } from "src/adapters/http/base.http.dto";
import { InventoryCardAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { AggregatorServicePort } from "src/core/aggregator/api/aggregator.service.port";
import { UpdateCardDto } from "src/core/card/api/card.dto";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { IngestionOrchestratorPort } from "src/core/ingestion/api/ingestion.orchestrator.port";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { Role } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";
import { UserGuard } from "./auth/user.guard";
import { UserRole } from "./auth/user.role";

@Controller("card")
export class CardController {
    private readonly LOGGER: Logger = new Logger(CardController.name);

    constructor(
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
        @Inject(AggregatorServicePort) private readonly aggregatorService: AggregatorServicePort,
        @Inject(IngestionOrchestratorPort) private readonly ingestionOrchestrator: IngestionOrchestratorPort
    ) { }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Role(UserRole.Admin)
    @Get(":setCode")
    @Render("ingestCards")
    async ingestCards(@Param("setCode") setCode: string) {
        return {
            cards: await this.ingestionOrchestrator.ingestSetCards(setCode),
            inventory: [],
        };
    }

    @UseGuards(UserGuard)
    @Get(":id")
    @Render("card")
    async findOne(
        @Param("id") id: string,
        @Req() req: AuthenticatedRequest
    ): Promise<CardHttpDto> {
        this.LOGGER.debug(`findOne ${id}`);
        const userId = req.user ? req.user.id : 0;
        const _card: InventoryCardAggregateDto = await this.aggregatorService
            .findInventoryCardById(Number(id), userId);
        return {
            status: HttpStatus.OK,
            card: _card,
            message: "Card found"
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Patch(":id")
    @Role(UserRole.Admin)
    async update(@Body() updateCardDtos: UpdateCardDto[]) {
        return await this.cardService.save(updateCardDtos);
    }

    @UseGuards(UserGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: number,
        @Req() req: AuthenticatedRequest
    ): Promise<CardHttpDto> {
        this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
        const userId = req.user ? req.user.id : 0;
        const _card = await this.aggregatorService
            .findInventoryCardBySetNumber(setCode, setNumber, userId);
        return {
            status: HttpStatus.OK,
            card: _card,
            message: null
        };
    }
}

export class CardHttpDto extends BaseHttpDto {
    readonly card: InventoryCardAggregateDto;
}