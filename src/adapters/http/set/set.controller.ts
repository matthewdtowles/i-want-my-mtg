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
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { ActionStatus, SetListViewDto, SetResponseDto, SetViewDto } from "src/adapters/http/http.types";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";

@Controller("sets")
export class SetController {
    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(@Inject(SetService) private readonly setService: SetService) { }

    @UseGuards(UserGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`get setListing`);
        // const _setList: Set[] = await this.setService.findAll();
        // const setListResponse: SetResponseDto[] = _setList.map(set => ({
        //     code: set.code,
        //     baseSize: set.baseSize,
        //     block: set.block,
        //     cards: set.cards ? set.cards : [],
        //     keyruneCode: set.keyruneCode,
        //     name: set.name,
        //     parentCode: set.parentCode,
        //     releaseDate: set.releaseDate,
        //     totalCards: set.cards ? set.cards.length : 0,
        //     type: set.type,
        //     url: `/sets/${set.code.toLowerCase()}`,
        // }));
        // return {
        //     authenticated: req.isAuthenticated(),
        //     breadcrumbs: [
        //         { label: "Home", url: "/" },
        //         { label: "Sets", url: "/sets" },
        //     ],
        //     message: _setList ? `${_setList.length} sets found` : "No sets found",
        //     setList: setListResponse,
        //     status: _setList ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        // };
        throw new Error("Set listing not implemented yet");
    }

    @UseGuards(UserGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Param("setCode") setCode: string,
        @Req() req: AuthenticatedRequest
    ): Promise<SetViewDto> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
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
        throw new Error("Set by code not implemented yet");
    }
}
