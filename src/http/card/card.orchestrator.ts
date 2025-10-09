import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { ActionStatus } from "src/http/action-status.enum";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { CardPresenter } from "src/http/card/card.presenter";
import { CardResponseDto } from "src/http/card/dto/card.response.dto";
import { CardViewDto } from "src/http/card/dto/card.view.dto";
import { SingleCardResponseDto } from "src/http/card/dto/single-card.response.dto";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { isAuthenticated } from "src/http/http.util";
import { InventoryPresenter } from "src/http/inventory/inventory.presenter";
import { InventoryQuantities } from "src/http/inventory/inventory.quantities";

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
        try {
            const userId: number = req.user ? req.user.id : 0;
            const coreCard: Card | null = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
            if (!coreCard) {
                throw new Error(`Card with set code ${setCode} and number ${setNumber} not found`);
            }
            const inventory: Inventory[] = userId > 0
                ? await this.inventoryService.findForUser(userId, coreCard.id) : [];

            const inventoryQuantities: InventoryQuantities = InventoryPresenter
                .toQuantityMap(inventory)?.get(coreCard.id);

            const singleCard: SingleCardResponseDto = CardPresenter
                .toSingleCardResponse(coreCard, inventoryQuantities, CardImgType.NORMAL);

            const allPrintings: Card[] = await this.cardService.findAllWithName(singleCard.name);
            const otherPrintings: CardResponseDto[] = allPrintings
                .filter(card => card.setCode !== setCode)
                .map(card => CardPresenter.toCardResponse(card, null, CardImgType.SMALL));

            return new CardViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Sets", url: "/sets" },
                    { label: singleCard.setCode.toUpperCase(), url: `/sets/${singleCard.setCode}` },
                    { label: singleCard.name, url: `/cards/${singleCard.setCode}/${singleCard.number}` },
                ],
                card: singleCard,
                otherPrintings,
                message: HttpStatus.OK === 200 ? "Card found" : "Card not found",
                status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findSetCard");
        }
    }

    async getLastPage(setCode: string, limit: number, filter?: string): Promise<number> {
        try {
            const totalCards: number = await this.cardService.totalCardsInSet(setCode, filter);
            return Math.max(1, Math.ceil(totalCards / limit));
        } catch (error) {
            throw new Error(`Error calculating last page: ${String(error)}`);
        }
    }
}