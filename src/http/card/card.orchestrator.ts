import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { isAuthenticated } from "src/http/base/http.util";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { InventoryPresenter } from "src/http/inventory/inventory.presenter";
import { FilterView } from "src/http/list/filter.view";
import { PaginationView } from "src/http/list/pagination.view";
import { SortableHeaderView } from "src/http/list/sortable-header.view";
import { TableHeadersRowView } from "src/http/list/table-headers-row.view";
import { CardPresenter } from "./card.presenter";
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
                throw new Error(`Card with set code ${setCode} and number ${setNumber} not found`);
            }
            const inventory: Inventory[] = userId > 0 ? await this.inventoryService.findForUser(userId, coreCard.id) : [];

            const singleCard: SingleCardResponseDto = CardPresenter
                .toSingleCardResponse(
                    coreCard,
                    InventoryPresenter.toQuantityMap(inventory)?.get(coreCard.id), CardImgType.NORMAL
                );

            const options = new SafeQueryOptions({
                ...rawQuery,
                page: Math.min(
                    rawQuery.page,
                    await this.getPrintingsLastPage(singleCard.name, rawQuery)
                )
            });
            this.LOGGER.debug(`options: ${JSON.stringify(options)}`)

            const allPrintings: Card[] = await this.cardService.findWithName(singleCard.name, options);
            const baseUrl = `/card/${singleCard.setCode}/${singleCard.number}`;

            return new CardViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Sets", url: "/sets" },
                    { label: singleCard.setCode.toUpperCase(), url: `/sets/${singleCard.setCode}` },
                    { label: singleCard.name, url: baseUrl },
                ],
                card: singleCard,
                otherPrintings: allPrintings.filter(card => card.setCode !== setCode).map(
                    card => CardPresenter.toCardResponse(card, null, CardImgType.SMALL)
                ),
                message: HttpStatus.OK === 200 ? "Card found" : "Card not found",
                status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                pagination: new PaginationView(
                    options,
                    baseUrl,
                    await this.cardService.totalWithName(singleCard.name)
                ),
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView([
                    new SortableHeaderView(options, SortOptions.NAME, ["pl-2"]),
                    new SortableHeaderView(options, SortOptions.NAME),
                    new SortableHeaderView(options, SortOptions.PRICE),
                    new SortableHeaderView(options, SortOptions.PRICE_FOIL, ["pr - 2"]),
                ])
            });
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "findSetCard");
        }
    }

    async getPrintingsLastPage(name: string, query: SafeQueryOptions): Promise<number> {
        try {
            const totalCards: number = await this.cardService.totalWithName(name);
            return Math.max(1, Math.ceil(totalCards / query.limit));
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "getPrintingsLastPage");
        }
    }
}