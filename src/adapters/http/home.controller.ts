import { Controller, Get, Inject, Logger, Render, Req, UseGuards } from "@nestjs/common";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { ActionStatus } from "src/adapters/http/http.types";
import { SetListViewDto } from "src/adapters/http/set/set-list.view.dto";
import { SetMetaDto } from "src/adapters/http/set/set-meta.dto";
import { SetPresenter } from "src/adapters/http/set/set.presenter";
import { Set } from "src/core/set/set.entity";
import { SetService } from "src/core/set/set.service";


@Controller()
export class HomeController {
    private readonly LOGGER: Logger = new Logger(HomeController.name);

    constructor(@Inject(SetService) private readonly setService: SetService) { }

    @UseGuards(UserGuard)
    @Get("/")
    @Render("setListpage")
    async getHomePage(@Req() req: AuthenticatedRequest): Promise<SetListViewDto> {
        this.LOGGER.debug(`Home page - fetch list of all sets`);
        const allSets: Set[] = await this.setService.findAll();
        // const uniqueOwned: number = req.user ? await this.inventoryService.getUniqueOwnedCountByUserId(req.user.id) : 0;
        const uniqueOwned: number = 0; // TODO: implement unique owned count in set service
        const setMetaList: SetMetaDto[] = allSets.map((s: Set) => SetPresenter.toSetMetaDto(s, uniqueOwned));
        this.LOGGER.debug(`Found ${JSON.stringify(setMetaList.length)} sets`);
        this.LOGGER.debug(`First set: ${JSON.stringify(setMetaList[0])} sets`);
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [
                { label: "Home", url: "/" },
                { label: "Sets", url: "/sets" },
            ],
            message: allSets ? `${allSets.length} sets found` : "No sets found",
            setList: setMetaList,
            status: allSets ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        };
    }
}