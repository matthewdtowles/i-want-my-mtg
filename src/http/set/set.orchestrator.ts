import { Inject, Injectable, Logger } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";
import { ActionStatus } from "src/http/base/action-status.enum";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { Breadcrumb } from "src/http/base/breadcrumb";
import { isAuthenticated } from "src/http/base/http.util";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { FilterResponseDto } from "src/http/list/filter.response.dto";
import { PaginationResponseDto } from "src/http/list/pagination.response.dto";
import { SortResponseDto } from "src/http/list/sort.response.dto";
import { SetListViewDto } from "./dto/set-list.view.dto";
import { SetResponseDto } from "./dto/set.response.dto";
import { SetViewDto } from "./dto/set.view.dto";
import { SetPresenter } from "./set.presenter";

@Injectable()
export class SetOrchestrator {

    private readonly LOGGER: Logger = new Logger(SetOrchestrator.name);

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(CardService) private readonly cardService: CardService,
    ) { }

    async findSetList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[],
        query: SafeQueryOptions
    ): Promise<SetListViewDto> {
        try {
            const [sets, totalSets] = await Promise.all([
                this.setService.findSets(query),
                this.setService.totalSetsCount(query)
            ]);
            const baseUrl = "/sets";
            const pagination = new PaginationResponseDto(query, baseUrl, totalSets);
            return new SetListViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs,
                message: `Page ${pagination.current} of ${pagination.total}`,
                setList: sets.map((set: Set) => SetPresenter.toSetMetaDto(set, 0)),
                status: ActionStatus.SUCCESS,
                pagination,
                filter: new FilterResponseDto(query, baseUrl),
                sort: new SortResponseDto(),
            });
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "findSetListPaginated");
        }
    }

    async findBySetCode(
        req: AuthenticatedRequest,
        setCode: string,
        query: SafeQueryOptions
    ): Promise<SetViewDto> {
        try {
            const userId: number = req.user ? req.user.id : 0;
            const set: Set | null = await this.setService.findByCode(setCode);
            if (!set) {
                throw new Error(`Set with code ${setCode} not found`);
            }
            const cards: Card[] = await this.cardService.findBySet(setCode, query);
            set.cards.push(...cards);
            let inventory: Inventory[] = [];
            if (userId && set.cards?.length) {
                const cardIds: string[] = set && set.cards ? set.cards.map((c: Card) => c.id) : [];
                inventory = await this.inventoryService.findByCards(userId, cardIds);
            }
            const setResonse: SetResponseDto = SetPresenter.toSetResponseDto(set, inventory);
            const baseUrl = `/sets/${setCode}`;

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
                pagination: new PaginationResponseDto(
                    query,
                    baseUrl,
                    await this.cardService.totalCardsInSet(setCode, query)
                ),
                filter: new FilterResponseDto(query, baseUrl),
                sort: new SortResponseDto(),
            });
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "findBySetCodeWithPagination");
        }
    }

    async getLastPage(query: SafeQueryOptions): Promise<number> {
        try {
            const totalSets = await this.setService.totalSetsCount(query);
            return Math.max(1, Math.ceil(totalSets / query.limit));
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "getLastPage");
        }
    }

    async getLastCardPage(setCode: string, query: SafeQueryOptions): Promise<number> {
        try {
            const totalCards = await this.cardService.totalCardsInSet(setCode, query);
            return Math.max(1, Math.ceil(totalCards / query.limit));
        } catch (error) {
            this.LOGGER.error(error.message);
            return HttpErrorHandler.toHttpException(error, "getLastCardPage");
        }
    }
}