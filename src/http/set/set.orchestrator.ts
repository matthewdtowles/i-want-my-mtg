import { Inject, Injectable } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { Breadcrumb } from "src/http/base/breadcrumb";
import { isAuthenticated } from "src/http/base/http.util";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { FilterView } from "src/http/list/filter.view";
import { PaginationView } from "src/http/list/pagination.view";
import { SortableHeaderView } from "src/http/list/sortable-header.view";
import { TableHeaderView } from "src/http/list/table-header.view";
import { TableHeadersRowView } from "src/http/list/table-headers-row.view";
import { getLogger } from "src/logger/global-app-logger";
import { SetListViewDto } from "./dto/set-list.view.dto";
import { SetResponseDto } from "./dto/set.response.dto";
import { SetViewDto } from "./dto/set.view.dto";
import { SetPresenter } from "./set.presenter";

@Injectable()
export class SetOrchestrator {

    private readonly LOGGER = getLogger(SetOrchestrator.name);

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(CardService) private readonly cardService: CardService,
    ) { }

    async findSetList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[],
        options: SafeQueryOptions
    ): Promise<SetListViewDto> {
        this.LOGGER.debug(`Find list of sets.`);
        try {
            const [sets, totalSets] = await Promise.all([
                this.setService.findSets(options),
                this.setService.totalSetsCount(options)
            ]);
            const baseUrl = "/sets";
            const pagination = new PaginationView(options, baseUrl, totalSets);
            this.LOGGER.debug(`Found ${sets?.length} of ${totalSets} total sets.`);
            return new SetListViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs,
                message: `Page ${pagination.current} of ${pagination.total}`,
                setList: sets.map((set: Set) => SetPresenter.toSetMetaDto(set, 0)),
                status: ActionStatus.SUCCESS,
                pagination,
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView([
                    new SortableHeaderView(options, SortOptions.SET, ["pl-2"]),
                    new TableHeaderView("Set Value"),
                    new TableHeaderView("Owned Value"),
                    new SortableHeaderView(options, SortOptions.RELEASE_DATE, ["xs-hide", "pr-2"]),
                ])
            });
        } catch (error) {
            this.LOGGER.debug(`Error finding list of sets: ${error?.message}`);
            return HttpErrorHandler.toHttpException(error, "findSetListPaginated");
        }
    }

    async findBySetCode(
        req: AuthenticatedRequest,
        setCode: string,
        options: SafeQueryOptions
    ): Promise<SetViewDto> {
        this.LOGGER.debug(`Find set and cards for set ${setCode}.`);
        try {
            const userId: number = req.user ? req.user.id : 0;
            const set: Set | null = await this.setService.findByCode(setCode);
            if (!set) {
                throw new Error(`Set with code ${setCode} not found`);
            }
            const cards: Card[] = await this.cardService.findBySet(setCode, options);
            set.cards.push(...cards);
            let inventory: Inventory[] = [];
            if (userId && set.cards?.length) {
                const cardIds: string[] = set && set.cards ? set.cards.map((c: Card) => c.id) : [];
                inventory = await this.inventoryService.findByCards(userId, cardIds);
            }
            const setResonse: SetResponseDto = SetPresenter.toSetResponseDto(
                set,
                inventory,
                (await this.getSetTotalValue(setCode)),
                (await this.inventoryService.totalValueForSet(userId, setCode))
            );
            const baseUrl = `/sets/${setCode}`;
            this.LOGGER.debug(`Found ${set?.cards?.length} cards for set ${setCode}.`)
            return new SetViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Sets", url: "/sets" },
                    { label: setResonse.name, url: baseUrl },
                ],
                message: setResonse ? `Found set: ${setResonse.name}` : "Set not found",
                set: setResonse,
                status: setResonse ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                pagination: new PaginationView(
                    options,
                    baseUrl,
                    await this.cardService.totalCardsInSet(setCode, options)
                ),
                filter: new FilterView(options, baseUrl),
                tableHeadersRow: new TableHeadersRowView([
                    new TableHeaderView("Owned"),
                    new SortableHeaderView(options, SortOptions.NUMBER),
                    new SortableHeaderView(options, SortOptions.CARD),
                    new TableHeaderView("Mana Cost", ["xs-hide"]),
                    new TableHeaderView("Rarity", ["xs-hide"]),
                    new SortableHeaderView(options, SortOptions.PRICE, ["xs-hide"]),
                    new SortableHeaderView(options, SortOptions.PRICE_FOIL, ["xs-hide", "pr-2"]),
                    new SortableHeaderView(options, SortOptions.PRICE, ["xs-show", "pr-2"]),
                ])
            });
        } catch (error) {
            this.LOGGER.debug(`Failed to find set ${setCode}: ${error?.message}.`);
            return HttpErrorHandler.toHttpException(error, "findBySetCodeWithPagination");
        }
    }

    async getLastPage(query: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Fetch last page number for list of all sets pagination.`);
        try {
            const totalSets = await this.setService.totalSetsCount(query);
            const lastPage = Math.max(1, Math.ceil(totalSets / query.limit));
            this.LOGGER.debug(`Last page for list of all sets is ${lastPage}.`);
            return lastPage;
        } catch (error) {
            this.LOGGER.debug(`Error getting last page number: ${error.message}.`);
            return HttpErrorHandler.toHttpException(error, "getLastPage");
        }
    }

    async getLastCardPage(setCode: string, query: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Fetch last page number for cards in set ${setCode}.`);
        try {
            const totalCards = await this.cardService.totalCardsInSet(setCode, query);
            const lastPage = Math.max(1, Math.ceil(totalCards / query.limit));
            this.LOGGER.debug(`Last page for cards in set ${setCode} is ${lastPage}.`);
            return lastPage;
        } catch (error) {
            this.LOGGER.debug(`Error getting last page number for cards in set ${setCode}: ${error.message}.`);
            return HttpErrorHandler.toHttpException(error, "getLastCardPage");
        }
    }

    async getSetTotalValue(setCode: string): Promise<number> {
        this.LOGGER.debug(`Get total value for set: ${setCode}.`);
        try {
            const totalValue = await this.cardService.totalValueForSet(setCode);
            this.LOGGER.debug(`Total value for set ${setCode}: ${totalValue}.`);
            return totalValue;
        } catch (error) {
            this.LOGGER.debug(`Error getting set ${setCode} total value: ${error.message}.`);
            return HttpErrorHandler.toHttpException(error, "getSetTotalValue");
        }
    }
}