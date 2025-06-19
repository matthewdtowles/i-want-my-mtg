import {
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Param, Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { CardPresenter } from "src/adapters/http/card/card.presenter";
import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";
import { CardViewDto } from "src/adapters/http/card/dto/card.view.dto";
import { SingleCardResponseDto } from "src/adapters/http/card/dto/single-card.response.dto";
import { breadcrumbsForCard } from "src/adapters/http/view.util";
import { Card } from "src/core/card/card.entity";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";

@Controller("card")
export class CardController {
    private readonly LOGGER: Logger = new Logger(CardController.name);

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
    ) { }


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
        const coreCard: Card = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
        if (!coreCard) {
            throw new Error(`Card with set code ${setCode} and number ${setNumber} not found`);
        }
        const inventory: Inventory[] = userId > 0 ? await this.inventoryService.findForUser(userId, coreCard.id) : [];
        const singleCard: SingleCardResponseDto = CardPresenter.toSingleCardResponse(coreCard, inventory);

        const allPrintings: Card[] = await this.cardService.findAllWithName(singleCard.name);
        const _otherPrintings: CardResponseDto[] = allPrintings
            .filter((card: Card) => card.setCode !== setCode)
            .map((card: Card) => CardPresenter.toCardResponse(card, []));

        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: breadcrumbsForCard(singleCard.setCode, singleCard.name, singleCard.number),
            card: singleCard,
            message: HttpStatus.OK ? "Card found" : "Card not found",
            otherPrintings: _otherPrintings,
            status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        };
    }
}
