import {
    Controller,
    Get,
    Inject,
    Logger,
    Param,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { ActionStatus } from "src/adapters/http/action-status.enum";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { SetListViewDto } from "src/adapters/http/set/dto/set-list.view.dto";
import { SetMetaResponseDto } from "src/adapters/http/set/dto/set-meta.response.dto";
import { SetViewDto } from "src/adapters/http/set/dto/set.view.dto";
import { SetPresenter } from "src/adapters/http/set/set.presenter";
import { InventoryService } from "src/core/inventory/inventory.service";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";

@Controller("sets")
export class SetController {
    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(
        @Inject(SetService) private readonly setService: SetService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService
    ) { }

    @UseGuards(UserGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`get setListing`);
        const allSets: Set[] = await this.setService.findAll();
        // const uniqueOwned: number = req.user ? await this.inventoryService.getUniqueOwnedCountByUserId(req.user.id) : 0;
        const uniqueOwned: number = 0; // TODO: implement unique owned count in set service
        const setMetaList: SetMetaResponseDto[] = allSets.map((s: Set) => SetPresenter.toSetMetaDto(s, uniqueOwned));
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [
                { label: "Home", url: "/" },
                { label: "Sets", url: "/sets" },
            ],
            message: allSets ? `${allSets.length} sets found` : "No sets found",
            setList: setMetaList,
            status: allSets ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        };
    }

    @UseGuards(UserGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Param("setCode") setCode: string,
        @Req() req: AuthenticatedRequest
    ): Promise<SetViewDto> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
        throw new Error("findBySetCode - Not implemented yet");
        // const userId = req.user ? req.user.id : 0;
        // const _set: SetResponseDto = await this.aggregatorService.findInventorySetByCode(setCode, userId);
        // return {
        //     authenticated: req.isAuthenticated(),
        //     breadcrumbs: [
        //         { label: "Home", url: "/" },
        //         { label: "Sets", url: "/sets" },
        //         { label: _set.name, url: `/sets/${setCode}` },
        //     ],
        //     message: _set ? `Found set: ${_set.name}` : "Set not found",
        //     set: _set,
        //     status: _set ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        // };
    }
}
