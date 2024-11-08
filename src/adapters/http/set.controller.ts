import {
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Param,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { BaseHttpDto } from "src/adapters/http/base.http.dto";
import { InventorySetAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { AggregatorServicePort } from "src/core/aggregator/api/aggregator.service.port";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { UserGuard } from "./auth/user.guard";

@Controller("sets")
export class SetController {
    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(
        @Inject(SetServicePort) private readonly setService: SetServicePort,
        @Inject(AggregatorServicePort) private readonly aggregatorService: AggregatorServicePort
    ) { }

    @Get()
    @Render("setListPage")
    async setListing(): Promise<SetListHttpDto> {
        this.LOGGER.debug(`get setListing`);
        const _setList: SetDto[] = await this.setService.findAll();
        return {
            status: HttpStatus.OK,
            setList: _setList,
            message: "Sets found"
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
        const _set: InventorySetAggregateDto = await this.aggregatorService
            .findInventorySetByCode(setCode, userId);
        return {
            status: HttpStatus.OK,
            set: _set,
            message: "Set found"
        };
    }
}

export class SetListHttpDto extends BaseHttpDto {
    readonly setList: SetDto[];
}

export class SetHttpDto extends BaseHttpDto {
    readonly set: InventorySetAggregateDto;
}