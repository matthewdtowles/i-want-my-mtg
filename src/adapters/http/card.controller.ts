import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Param,
    Patch,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest, Role, UserRole } from "src/adapters/http/auth/auth.types";
import { ActionStatus, BaseHttpDto } from "src/adapters/http/http.types";
import { breadcrumbsForCard } from "src/adapters/http/view.util";
import { InventoryCardAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { AggregatorServicePort } from "src/core/aggregator/api/aggregator.service.port";
import { CardDto } from "src/core/card/api/card.dto";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { UpdateCardDto } from "src/core/card/api/create-card.dto";
import { IngestionOrchestratorPort } from "src/core/ingestion/api/ingestion.orchestrator.port";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { UserGuard } from "./auth/user.guard";

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
        this.LOGGER.debug(`ingestCards for set ${setCode}`);
        return { cards: await this.ingestionOrchestrator.ingestSetCards(setCode) };
    }

    @UseGuards(UserGuard)
    @Get(":id")
    @Render("card")
    async findOne(@Param("id") id: string, @Req() req: AuthenticatedRequest): Promise<CardHttpDto> {

        this.LOGGER.debug(`findOne ${id}`);
        const userId = req.user ? req.user.id : 0;
        const _card: InventoryCardAggregateDto = await this.aggregatorService
            .findInventoryCardById(Number(id), userId);
        const allPrintings: CardDto[] = await this.cardService.findAllWithName(_card.name);

        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: breadcrumbsForCard(_card),
            card: _card,
            message: HttpStatus.OK ? "Card found" : "Card not found",
            otherPrintings: allPrintings.filter((card: CardDto) => card.setCode !== _card.setCode),
            status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        };
    }

    @UseGuards(UserGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: string,
        @Req() req: AuthenticatedRequest
    ): Promise<CardHttpDto> {

        this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
        const userId = req.user ? req.user.id : 0;
        const _card: InventoryCardAggregateDto = await this.aggregatorService
            .findInventoryCardBySetNumber(setCode, setNumber, userId);
        const allPrintings: CardDto[] = await this.cardService.findAllWithName(_card.name);

        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: breadcrumbsForCard(_card),
            card: _card,
            message: HttpStatus.OK ? "Card found" : "Card not found",
            otherPrintings: allPrintings.filter((card: CardDto) => card.setCode !== setCode),
            status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Patch(":id")
    @Role(UserRole.Admin)
    async update(@Body() updateCardDtos: UpdateCardDto[]) {
        this.LOGGER.debug(`Update cards`);
        return await this.cardService.save(updateCardDtos);
    }
}

export class CardHttpDto extends BaseHttpDto {
    readonly card: InventoryCardAggregateDto;
    readonly otherPrintings: CardDto[];
}