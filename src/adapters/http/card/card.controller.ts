import {
    Controller,
    Get, Inject,
    Logger,
    Param, Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { CardOrchestrator } from "src/adapters/http/card/card.orchestrator";
import { CardViewDto } from "src/adapters/http/card/dto/card.view.dto";

@Controller("card")
export class CardController {
    private readonly LOGGER: Logger = new Logger(CardController.name);

    constructor(@Inject(CardOrchestrator) private readonly cardService: CardOrchestrator) { }


    @UseGuards(UserGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: string,
        @Req() req: AuthenticatedRequest
    ): Promise<CardViewDto> {
        this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
        return this.cardService.findSetCard(setCode, setNumber, req);
    }
}
