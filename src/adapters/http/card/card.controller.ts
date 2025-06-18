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
        // TODO fix whatever we are supposed to call here
        const coreCard: Card = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
        const singleCard: SingleCardResponseDto = CardPresenter.toSingleCardResponse(coreCard).fromCard(coreCard, userId);
        const allPrintings: Card[] = await this.cardService.findAllWithName(singleCard.name);
        const _otherPrintings: CardResponseDto[] = allPrintings
            .filter((card: Card) => card.setCode !== setCode)
            .map((card: Card) => CardPresenter.toCardResponse(card).fromCard(card, userId));

        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: breadcrumbsForCard(singleCard.setCode, singleCard.name, singleCard.number),
            card: singleCard,
            message: HttpStatus.OK ? "Card found" : "Card not found",
            otherPrintings: _otherPrintings,
            status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        };
        throw new Error("Card by set code and number not implemented yet");
    }
}
