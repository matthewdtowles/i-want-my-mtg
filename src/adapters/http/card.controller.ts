import {
    Body,
    Controller,
    Get,
    Inject,
    Logger,
    Param,
    Patch,
    Render, Req, UseGuards
} from "@nestjs/common";
import { CardDto, UpdateCardDto } from "src/core/card/api/card.dto";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { IngestionOrchestratorPort } from "src/core/ingestion/api/ingestion.orchestrator.port";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { Role } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";
import { UserRole } from "./auth/user.role";
import { UserGuard } from "./auth/user.guard";

@Controller("card")
export class CardController {
    private readonly LOGGER: Logger = new Logger(CardController.name);

    constructor(
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
        @Inject(InventoryServicePort) private readonly inventoryService: InventoryServicePort,
        @Inject(IngestionOrchestratorPort)
        private readonly ingestionOrchestrator: IngestionOrchestratorPort,
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
    ): Promise<{ card: CardDto, inventory: InventoryDto[] }> {
        this.LOGGER.debug(`findOne ${id}`);
        const _card = await this.cardService.findById(Number(id));
        this.LOGGER.debug(`card: ${JSON.stringify(_card)}`);
        this.LOGGER.debug(`req.user: ${JSON.stringify(req.user)}`);
        const _inventory: InventoryDto[] = req.user
            ? await this.inventoryService.findByUser(req.user.id) : [];
        return {
            card: _card,
            inventory: _inventory
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
    ): Promise<{ card: CardDto, inventory: InventoryDto[] }> {
        this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
        const _card: CardDto | null = await this.cardService
            .findBySetCodeAndNumber(setCode, setNumber);
        this.LOGGER.debug(`card: ${JSON.stringify(_card)}`);
        this.LOGGER.debug(`req.user: ${JSON.stringify(req.user)}`);
        const _inventory: InventoryDto[] = req.user
            ? await this.inventoryService.findByUser(req.user.id) : [];
        return {
            card: _card,
            inventory: _inventory
        };
    }
}
