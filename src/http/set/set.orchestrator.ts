import { Inject, Injectable } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { ActionStatus } from "src/http/base/action-status.enum";
import { Breadcrumb } from "src/http/base/breadcrumb";
import { isAuthenticated } from "src/http/base/http.util";
import { PaginationDto } from "src/http/base/pagination.dto";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { SetListViewDto } from "./dto/set-list.view.dto";
import { SetMetaResponseDto } from "./dto/set-meta.response.dto";
import { SetResponseDto } from "./dto/set.response.dto";
import { SetViewDto } from "./dto/set.view.dto";
import { SetPresenter } from "./set.presenter";
import { QueryOptionsDto } from "src/core/query/query-options.dto";

@Injectable()
export class SetOrchestrator {

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(CardService) private readonly cardService: CardService,
    ) { }

    async findSetList(
        req: AuthenticatedRequest,
        breadcrumbs: Breadcrumb[],
        query: QueryOptionsDto
    ): Promise<SetListViewDto> {
        try {
            const [sets, totalSets] = await Promise.all([
                this.setService.findSets(query.page, query.limit, query.filter),
                this.setService.totalSetsCount(query.filter)
            ]);
            const uniqueOwned: number = 0;
            const setMetaList: SetMetaResponseDto[] = sets.map((set: Set) => SetPresenter.toSetMetaDto(set, uniqueOwned));
            const baseUrl = "/sets";
            const pagination = new PaginationDto(query.page, totalSets, query.limit, baseUrl, query.filter);
            return new SetListViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs,
                message: `Page ${query.page} of ${Math.ceil(totalSets / query.limit)}`,
                setList: setMetaList,
                status: ActionStatus.SUCCESS,
                pagination,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findSetListPaginated");
        }
    }

    async findBySetCode(
        req: AuthenticatedRequest,
        setCode: string,
        query: QueryOptionsDto
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
            const totalCardsInSet: number = await this.cardService.totalCardsInSet(setCode, query.filter);
            const baseUrl = `/sets/${setCode}`;
            return new SetViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Sets", url: "/sets" },
                    { label: setResonse.name, url: `/sets/${setCode}` },
                ],
                message: setResonse ? `Found set: ${setResonse.name}` : "Set not found",
                set: setResonse,
                status: setResonse ? ActionStatus.SUCCESS : ActionStatus.ERROR,
                pagination: new PaginationDto(query.page, totalCardsInSet, query.limit, baseUrl, query.filter),
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findBySetCodeWithPagination");
        }
    }

    async getLastPage(query: QueryOptionsDto): Promise<number> {
        try {
            const totalSets = await this.setService.totalSetsCount(query.filter);
            return Math.max(1, Math.ceil(totalSets / query.limit));
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "getLastPage");
        }
    }

    async getLastCardPage(setCode: string, query: QueryOptionsDto): Promise<number> {
        try {
            const totalCards = await this.cardService.totalCardsInSet(setCode, query.filter);
            return Math.max(1, Math.ceil(totalCards / query.limit));
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "getLastCardPage");
        }
    }
}