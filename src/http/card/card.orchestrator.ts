import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { QueryOptionsDto } from "src/core/query/query-options.dto";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { isAuthenticated } from "src/http/base/http.util";
import { PaginationDto } from "src/http/base/pagination.dto";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { InventoryPresenter } from "src/http/inventory/inventory.presenter";
import { InventoryQuantities } from "src/http/inventory/inventory.quantities";
import { CardPresenter } from "./card.presenter";
import { CardResponseDto } from "./dto/card.response.dto";
import { CardViewDto } from "./dto/card.view.dto";
import { SingleCardResponseDto } from "./dto/single-card.response.dto";

@Injectable()
export class CardOrchestrator {

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService
    ) { }

    async findSetCard(
        req: AuthenticatedRequest,
        setCode: string,
        setNumber: string,
        query: QueryOptionsDto
    ): Promise<CardViewDto> {
        try {
            const userId: number = req.user ? req.user.id : 0;
            const coreCard: Card | null = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
            if (!coreCard) {
                throw new Error(`Card with set code ${setCode} and number ${setNumber} not found`);
            }
            const inventory: Inventory[] = userId > 0 ? await this.inventoryService.findForUser(userId, coreCard.id) : [];

            const inventoryQuantities: InventoryQuantities = InventoryPresenter
                .toQuantityMap(inventory)
                ?.get(coreCard.id);

            const singleCard: SingleCardResponseDto = CardPresenter
                .toSingleCardResponse(coreCard, inventoryQuantities, CardImgType.NORMAL);

            const allPrintings: Card[] = await this.cardService.findWithName(singleCard.name, query);

            const otherPrintings: CardResponseDto[] = allPrintings
                .filter(card => card.setCode !== setCode)
                .map(card => CardPresenter.toCardResponse(card, null, CardImgType.SMALL));

            const totalCardsWithName: number = await this.cardService.totalWithName(singleCard.name);
            const baseUrl = `/card/${singleCard.setCode}/${singleCard.number}`;

            return new CardViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Sets", url: "/sets" },
                    { label: singleCard.setCode.toUpperCase(), url: `/sets/${singleCard.setCode}` },
                    { label: singleCard.name, url: `/card/${singleCard.setCode}/${singleCard.number}` },
                ],
                card: singleCard,
                otherPrintings,
                message: HttpStatus.OK === 200 ? "Card found" : "Card not found",
                status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                pagination: new PaginationDto(query.page, totalCardsWithName, query.limit, baseUrl),
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findSetCard");
        }
    }

    async getPrintingsLastPage(name: string, query: QueryOptionsDto): Promise<number> {
        try {
            const totalCards: number = await this.cardService.totalWithName(name);
            return Math.max(1, Math.ceil(totalCards / query.limit));
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "getPrintingsLastPage");
        }
    }
}