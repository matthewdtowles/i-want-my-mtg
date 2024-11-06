import { Controller, Get, Inject, Logger, Param, Render, Req, UseGuards } from "@nestjs/common";
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
        @Inject(AggregatorServicePort) private readonly aggregatorService: AggregatorServicePort,
    ) { }

    @Get()
    @Render("setListPage")
    async setListing(): Promise<{ setList: SetDto[] }> {
        this.LOGGER.debug(`get setListing`);
        return { setList: await this.setService.findAll() };
    }

    @UseGuards(UserGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Param("setCode") setCode: string,
        @Req() req: AuthenticatedRequest
    ): Promise<InventorySetAggregateDto> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
        const userId = req.user ? req.user.id : 0;
        return await this.aggregatorService.findInventorySetByCode(setCode, userId);
    }
}
