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
import { ActionStatus, SetViewDto, SetListViewDto } from "src/adapters/http/http.types";
import { AuthenticatedRequest } from "./auth/auth.types";
import { UserGuard } from "./auth/user.guard";
import { Set, SetService } from "src/core/set";

@Controller("sets")
export class SetController {
    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(@Inject(SetService) private readonly setService: SetService) { }

    @UseGuards(UserGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`get setListing`);
        const _setList: Set[] = await this.setService.findAll();
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [
                { label: "Home", url: "/" },
                { label: "Sets", url: "/sets" },
            ],
            message: _setList ? `${_setList.length} sets found` : "No sets found",
            setList: _setList,
            status: _setList ? ActionStatus.SUCCESS : ActionStatus.ERROR,
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
        const userId = req.user ? req.user.id : 0;
        const _set: SetResponseDto = await this.aggregatorService.findInventorySetByCode(setCode, userId);
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [
                { label: "Home", url: "/" },
                { label: "Sets", url: "/sets" },
                { label: _set.name, url: `/sets/${setCode}` },
            ],
            message: _set ? `Found set: ${_set.name}` : "Set not found",
            set: _set,
            status: _set ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        };
    }
}
