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
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { SetListViewDto } from "./dto/set-list.view.dto";
import { SetViewDto } from "./dto/set.view.dto";
import { SetOrchestrator } from "./set.orchestrator";

@Controller("sets")
export class SetController {

    private readonly LOGGER = new Logger(SetController.name);

    private readonly breadcrumbs = [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" }
    ];

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.log(`Find list of sets.`);
        const rawOptions = new SafeQueryOptions(req.query);
        const lastPage = await this.setOrchestrator.getLastPage(rawOptions);
        const options = new SafeQueryOptions({
            ...rawOptions,
            page: Math.min(rawOptions.page, lastPage)
        });
        const setList = await this.setOrchestrator.findSetList(req, this.breadcrumbs, options);
        this.LOGGER.log(`Found list of ${setList?.setList?.length} sets.`);
        return setList;
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(@Req() req: AuthenticatedRequest, @Param("setCode") setCode: string): Promise<SetViewDto> {
        this.LOGGER.log(`Find set and cards for set ${setCode}.`);
        const rawOptions = new SafeQueryOptions(req.query);
        const lastPage = await this.setOrchestrator.getLastCardPage(setCode, rawOptions);
        const options = new SafeQueryOptions({
            ...rawOptions,
            page: Math.min(rawOptions.page, lastPage)
        });
        const set = await this.setOrchestrator.findBySetCode(req, setCode, options);
        this.LOGGER.log(`Found set ${setCode} with ${set?.set?.cards?.length} cards.`);
        return set;
    }
}
