import { Inject, Injectable } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardService } from "src/core/card/card.service";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";
import { ActionStatus } from "src/http/action-status.enum";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { Breadcrumb } from "src/http/breadcrumb";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { isAuthenticated } from "src/http/http.util";
import { PaginationDto } from "src/http/pagination.dto";
import { SetListViewDto } from "src/http/set/dto/set-list.view.dto";
import { SetMetaResponseDto } from "src/http/set/dto/set-meta.response.dto";
import { SetResponseDto } from "src/http/set/dto/set.response.dto";
import { SetViewDto } from "src/http/set/dto/set.view.dto";
import { SetPresenter } from "src/http/set/set.presenter";

@Injectable()
export class SetOrchestrator {

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(CardService) private readonly cardService: CardService,
    ) { }

    async findSetList(
        req: AuthenticatedRequest,
        _breadcrumbs: Breadcrumb[],
        page: number,
        limit: number,
        filter?: string
    ): Promise<SetListViewDto> {
        try {
            const [sets, totalSets] = await Promise.all([
                this.setService.findSets(page, limit, filter),
                this.setService.totalSetsCount(filter)
            ]);
            const uniqueOwned: number = 0;
            const setMetaList: SetMetaResponseDto[] = sets.map((set: Set) => SetPresenter.toSetMetaDto(set, uniqueOwned));
            const baseUrl = "/sets";
            const pagination = new PaginationDto(page, totalSets, limit, baseUrl);
            return new SetListViewDto({
                authenticated: isAuthenticated(req),
                breadcrumbs: _breadcrumbs,
                message: `Page ${page} of ${Math.ceil(totalSets / limit)}`,
                setList: setMetaList,
                status: ActionStatus.SUCCESS,
                pagination: pagination,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findSetListPaginated");
        }
    }

    async findBySetCode(
        req: AuthenticatedRequest,
        setCode: string,
        page: number,
        limit: number,
        filter?: string
    ): Promise<SetViewDto> {
        try {
            const userId: number = req.user ? req.user.id : 0;
            const set: Set | null = await this.setService.findByCode(setCode);
            if (!set) {
                throw new Error(`Set with code ${setCode} not found`);
            }
            const cards: Card[] = await this.cardService.findBySet(setCode, page, limit, filter);
            set.cards.push(...cards);
            let inventory: Inventory[] = [];
            if (userId && set.cards?.length) {
                const cardIds: string[] = set && set.cards ? set.cards.map((c: Card) => c.id) : [];
                inventory = await this.inventoryService.findByCards(userId, cardIds);
            }
            const setResonse: SetResponseDto = SetPresenter.toSetResponseDto(set, inventory);
            const totalCardsInSet: number = await this.cardService.totalCardsInSet(setCode, filter);
            const baseUrl = `/sets/${setCode}`;
            const pagination = new PaginationDto(page, totalCardsInSet, limit, baseUrl);
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
                pagination: pagination,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findBySetCodeWithPagination");
        }
    }

    async getLastPage(limit: number, filter?: string): Promise<number> {
        try {
            const totalSets = await this.setService.totalSetsCount(filter);
            return Math.max(1, Math.ceil(totalSets / limit));
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "getLastPage");
        }
    }

    async getLastCardPage(setCode: string, limit: number, filter?: string): Promise<number> {
        try {
            const totalCards = await this.cardService.totalCardsInSet(setCode, filter);
            return Math.max(1, Math.ceil(totalCards / limit));
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "getLastCardPage");
        }
    }
}