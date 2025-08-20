import { Inject, Injectable } from "@nestjs/common";
import { ActionStatus } from "src/http/action-status.enum";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { Breadcrumb } from "src/http/breadcrumb";
import { HttpErrorHandler } from "src/http/http.error.handler";
import { SetListViewDto } from "src/http/set/dto/set-list.view.dto";
import { SetMetaResponseDto } from "src/http/set/dto/set-meta.response.dto";
import { SetResponseDto } from "src/http/set/dto/set.response.dto";
import { SetViewDto } from "src/http/set/dto/set.view.dto";
import { SetPresenter } from "src/http/set/set.presenter";
import { Card } from "src/core/card/card.entity";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryService } from "src/core/inventory/inventory.service";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";

@Injectable()
export class SetOrchestrator {

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
    ) { }

    async findSetList(req: AuthenticatedRequest, _breadcrumbs?: Breadcrumb[]): Promise<SetListViewDto> {
        try {
            const allSets: Set[] = await this.setService.findAll();
            // const uniqueOwned: number = req.user ? await this.inventoryService.getUniqueOwnedCountByUserId(req.user.id) : 0;
            const uniqueOwned: number = 0; // TODO: implement unique owned count in set service
            const setMetaList: SetMetaResponseDto[] = allSets.map((s: Set) => SetPresenter.toSetMetaDto(s, uniqueOwned));
            return new SetListViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: _breadcrumbs ? _breadcrumbs : [
                    { label: "Home", url: "/" },
                    { label: "Sets", url: "/sets" }
                ],
                message: allSets ? `${allSets.length} sets found` : "No sets found",
                setList: setMetaList,
                status: allSets ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findSetList");
        }
    }

    async findBySetCode(setCode: string, req: AuthenticatedRequest): Promise<SetViewDto> {
        try {
            const userId: number = req.user ? req.user.id : 0;
            const set: Set | null = await this.setService.findByCode(setCode);
            if (!set) {
                throw new Error(`Set with code ${setCode} not found`);
            }
            let inventory: Inventory[] = [];
            if (userId && set.cards?.length) {
                const cardIds: string[] = set && set.cards ? set.cards.map((c: Card) => c.id) : [];
                inventory = await this.inventoryService.findByCards(userId, cardIds);
            }
            const setResonse: SetResponseDto = SetPresenter.toSetResponseDto(set, inventory);
            return new SetViewDto({
                authenticated: req.isAuthenticated(),
                breadcrumbs: [
                    { label: "Home", url: "/" },
                    { label: "Sets", url: "/sets" },
                    { label: setResonse.name, url: `/sets/${setCode}` },
                ],
                message: setResonse ? `Found set: ${setResonse.name}` : "Set not found",
                set: setResonse,
                status: setResonse ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            });
        } catch (error) {
            return HttpErrorHandler.toHttpException(error, "findBySetCode");
        }
    }
}