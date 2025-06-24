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
import { SetListViewDto } from "src/adapters/http/set/dto/set-list.view.dto";
import { SetViewDto } from "src/adapters/http/set/dto/set.view.dto";
import { SetOrchestrator } from "src/adapters/http/set/set.orchestrator";

@Controller("sets")
export class SetController {

    private readonly LOGGER: Logger = new Logger(SetController.name);

    constructor(@Inject(SetOrchestrator) private readonly setService: SetOrchestrator) { }

    @UseGuards(UserGuard)
    @Get()
    @Render("setListPage")
    async setListing(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`get setListing`);
        return this.setService.findSetList(req);
    }

    @UseGuards(UserGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Param("setCode") setCode: string,
        @Req() req: AuthenticatedRequest
    ): Promise<SetViewDto> {
        this.LOGGER.debug(`findBySetCode ${setCode}`);
        return this.setService.findBySetCode(setCode, req);
    }
}
