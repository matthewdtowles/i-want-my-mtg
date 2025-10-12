import {
    Controller,
    Get,
    Inject,
    Param,
    Query,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/http/auth/dto/authenticated.request";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { safeAlphaNumeric, sanitizeInt } from "src/http/http.util";
import { SetListViewDto } from "src/http/set/dto/set-list.view.dto";
import { SetViewDto } from "src/http/set/dto/set.view.dto";
import { SetOrchestrator } from "src/http/set/set.orchestrator";

@Controller("sets")
export class SetController {
    private readonly breadcrumbs = [
        { label: "Home", url: "/" },
        { label: "Sets", url: "/sets" }
    ];
    private readonly defaultLimit = 25;

    constructor(@Inject(SetOrchestrator) private readonly setOrchestrator: SetOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get()
    @Render("setListPage")
    async setListing(
        @Req() req: AuthenticatedRequest,
        @Query("page") pageRaw?: string,
        @Query("limit") limitRaw?: string,
        @Query("filter") filterRaw?: string
    ): Promise<SetListViewDto> {
        const limit = sanitizeInt(limitRaw, this.defaultLimit);
        const filter = safeAlphaNumeric(filterRaw);
        const lastPage = await this.setOrchestrator.getLastPage(limit, filter);
        const page = Math.min(sanitizeInt(pageRaw, 1), lastPage);
        return this.setOrchestrator.findSetList(req, this.breadcrumbs, page, limit, filter);
    }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode")
    @Render("set")
    async findBySetCode(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Query("page") pageRaw?: string,
        @Query("limit") limitRaw?: string,
        @Query("filter") filterRaw?: string
    ): Promise<SetViewDto> {
        const limit = sanitizeInt(limitRaw, this.defaultLimit);
        const filter = safeAlphaNumeric(filterRaw);
        const lastPage = await this.setOrchestrator.getLastCardPage(setCode, limit, filter);
        const page = Math.min(sanitizeInt(pageRaw, 1), lastPage);
        return this.setOrchestrator.findBySetCode(req, setCode, page, limit, filter);
    }
}
