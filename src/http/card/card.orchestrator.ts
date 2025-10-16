import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { sanitizeInt } from "src/core/query/query.util";
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

    private readonly LOGGER: Logger = new Logger(CardOrchestrator.name);

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService
    ) { }

    async findSetCard(
        req: AuthenticatedRequest,
        setCode: string,
        setNumber: string,
        rawQuery: SafeQueryOptions
    ): Promise<CardViewDto> {
        try {
            const userId: number = req.user ? req.user.id : 0;
            const coreCard: Card | null = await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
            if (!coreCard) {
                const errMsg = `Card with set code ${setCode} and number ${setNumber} not found`;
                this.LOGGER.error(errMsg);
                throw new Error(errMsg);
            }
            const inventory: Inventory[] = userId > 0 ? await this.inventoryService.findForUser(userId, coreCard.id) : [];

            const inventoryQuantities: InventoryQuantities = InventoryPresenter
                .toQuantityMap(inventory)
                ?.get(coreCard.id);

            const singleCard: SingleCardResponseDto = CardPresenter
                .toSingleCardResponse(coreCard, inventoryQuantities, CardImgType.NORMAL);

            this.LOGGER.debug(`rawQuery before lastPage: ${JSON.stringify(rawQuery)}`)
            const lastPage = await this.getPrintingsLastPage(singleCard.name, rawQuery);
            this.LOGGER.debug(`rawQuery after lastPage: ${JSON.stringify(rawQuery)}`)
            this.LOGGER.debug(`lastPage: ${lastPage}`)
            const options = new SafeQueryOptions({
                ...rawQuery,
                page: Math.min(sanitizeInt(rawQuery.page, 1), lastPage)
            });
            this.LOGGER.debug(`options: ${JSON.stringify(options)}`)

            const allPrintings: Card[] = await this.cardService.findWithName(singleCard.name, options);

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
                pagination: new PaginationDto(options.page, totalCardsWithName, options.limit, baseUrl),
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findSetCard");
        }
    }

    async getPrintingsLastPage(name: string, query: SafeQueryOptions): Promise<number> {
        try {
            const totalCards: number = await this.cardService.totalWithName(name);
            return Math.max(1, Math.ceil(totalCards / query.limit));
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "getPrintingsLastPage");
        }
    }
}