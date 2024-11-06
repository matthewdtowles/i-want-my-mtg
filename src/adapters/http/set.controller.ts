import { Controller, Get, Inject, Logger, Param, Render, Req, UseGuards } from "@nestjs/common";
import { AggregatorServicePort } from "src/core/aggregator/api/aggregator.service.port";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
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
    ): Promise<{ set: SetDto, inventory: InventoryDto[] }> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
        const _set: SetDto = await this.setService.findByCode(setCode);
        // const _inventory: InventoryDto[] = req.user
        //     ? await this.aggregatorService.findInventorySetByCode(req.user.id) : [];
        // return {
        //     set: _set,
        //     inventory: _inventory,
        // };
        return null;
    }
}
