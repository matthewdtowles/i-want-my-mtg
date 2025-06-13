import { Controller, Get, Inject, Logger, Render, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { ActionStatus, SetListViewDto, SetResponseDto } from "src/adapters/http/http.types";
import { Set, SetService } from "src/core/set";

@Controller()
export class HomeController {
    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(@Inject(SetService) private readonly setService: SetService) { }

    @UseGuards(UserGuard)
    @Get("/")
    @Render("setListpage")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        const sets: Set[] = await this.setService.findAll();
        const setListResponse: SetResponseDto[] = sets.map(set => ({
            code: set.code,
            baseSize: set.baseSize,
            block: set.block,
            cards: set.cards ? set.cards : [],
            keyruneCode: set.keyruneCode,
            name: set.name,
            parentCode: set.parentCode,
            releaseDate: set.releaseDate,
            totalCards: set.cards ? set.cards.length : 0,
            type: set.type,
            url: `/sets/${set.code.toLowerCase()}`,
        }));
        const _message: string = req.query.message as string ?? null;
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [],
            message: _message,
            setList: setListResponse,
            status: sets ? ActionStatus.SUCCESS : ActionStatus.ERROR
        };
    }
}
