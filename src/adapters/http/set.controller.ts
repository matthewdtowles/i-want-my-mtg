import {
    Controller,
    Get, Inject,
    Logger,
    Param,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { ActionStatus, BaseHttpDto } from "src/adapters/http/http.types";
import { InventorySetAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { AggregatorServicePort } from "src/core/aggregator/api/aggregator.service.port";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";
import { AuthenticatedRequest } from "./auth/auth.types";
import { UserGuard } from "./auth/user.guard";

@Controller("sets")
export class SetController {
    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(
        @Inject(SetServicePort) private readonly setService: SetServicePort,
        @Inject(AggregatorServicePort) private readonly aggregatorService: AggregatorServicePort
    ) { }

    @UseGuards(UserGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListHttpDto> {
        this.LOGGER.debug(`get setListing`);
        const _setList: SetDto[] = await this.setService.findAll();
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
    ): Promise<SetHttpDto> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
        const userId = req.user ? req.user.id : 0;
        const _set: InventorySetAggregateDto = await this.aggregatorService.findInventorySetByCode(setCode, userId);
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

export class SetListHttpDto extends BaseHttpDto {
    readonly setList: SetDto[];
}

export class SetHttpDto extends BaseHttpDto {
    readonly set: InventorySetAggregateDto;
}