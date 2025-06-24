import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { CardPresenter } from "src/adapters/http/card/card.presenter";
import { CardViewDto } from "src/adapters/http/card/dto/card.view.dto";
import { InventoryPresenter } from "src/adapters/http/inventory/inventory.presenter";
import { breadcrumbsForCard } from "src/adapters/http/view.util";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { CardService } from "src/core/card/card.service";
import { InventoryService } from "src/core/inventory/inventory.service";

@Injectable()
export class CardOrchestrator {

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService
    ) { }

    async findSetCard(
        setCode: string,
        setNumber: string,
        req: AuthenticatedRequest
    ): Promise<CardViewDto> {
        const userId = req.user ? req.user.id : 0;
        const coreCard = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
        if (!coreCard) {
            throw new Error(`Card with set code ${setCode} and number ${setNumber} not found`);
        }
        const inventory = userId > 0 ? await this.inventoryService.findForUser(userId, coreCard.id) : [];
        const inventoryQuantities = InventoryPresenter.toQuantityMap(inventory)?.get(coreCard.id);
        const singleCard = CardPresenter.toSingleCardResponse(coreCard, inventoryQuantities, CardImgType.NORMAL);
        const allPrintings = await this.cardService.findAllWithName(singleCard.name);
        const otherPrintings = allPrintings
            .filter(card => card.setCode !== setCode)
            .map(card => CardPresenter.toCardResponse(card, null, CardImgType.SMALL));

        return new CardViewDto({
            authenticated: req.isAuthenticated(),
            breadcrumbs: breadcrumbsForCard(singleCard),
            card: singleCard,
            otherPrintings,
            message: HttpStatus.OK === 200 ? "Card found" : "Card not found",
            status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        });
    }
}