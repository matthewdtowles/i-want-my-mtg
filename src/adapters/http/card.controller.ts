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
import { ActionStatus, CardResponseDto, CardViewDto, InventoryCardResponseDto } from "src/adapters/http/http.types";
import { breadcrumbsForCard } from "src/adapters/http/view.util";
import { CardDto } from "src/core/card/api/card.dto";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { UpdateCardDto } from "src/core/card/api/create-card.dto";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { UserGuard } from "./auth/user.guard";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";

@Controller("card")
export class CardController {
    private readonly LOGGER: Logger = new Logger(CardController.name);

    constructor(
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
        @Inject(InventoryServicePort) private readonly inventoryService: InventoryServicePort,
    ) { }

    @UseGuards(UserGuard)
    @Get(":id")
    @Render("card")
    async findOne(@Param("id") id: string, @Req() req: AuthenticatedRequest): Promise<CardViewDto> {

        this.LOGGER.debug(`findOne ${id}`);
        const userId = req.user ? req.user.id : 0;
        let card: CardResponseDto;
        if (userId > 0) {
            const inventoryDto: InventoryDto[] = await this.inventoryService.findForUser(userId, Number(id));
            card = HttpMapper.toCardResponseDto(inventoryDto);
        } else {
            const cardDto: CardDto = await this.cardService.findById(Number(id));
            card = HttpMapper.toCardResponseDto(cardDto);
        }
        const allPrintings: InventoryCardResponseDto[] = await this.cardService.findAllWithName(card.name);

        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: breadcrumbsForCard(card.setCode, card.name, card.number),
            card,
            message: HttpStatus.OK ? "Card found" : "Card not found",
            otherPrintings: allPrintings.filter((card: CardDto) => card.setCode !== card.setCode),
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
    ): Promise<CardViewDto> {

        this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
        const userId = req.user ? req.user.id : 0;
        const _card: InventoryCardResponseDto = await this.inventoryService
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
