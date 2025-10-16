import {
    Controller,
    Get, Inject, Logger, Param,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { QueryOptionsDto } from "src/core/query/query-options.dto";
import { OptionalAuthGuard } from "src/http/auth/optional-auth.guard";
import { AuthenticatedRequest } from "src/http/base/authenticated.request";
import { CardOrchestrator } from "./card.orchestrator";
import { CardViewDto } from "./dto/card.view.dto";

@Controller("card")
export class CardController {

    private readonly LOGGER: Logger = new Logger(CardController.name);

    constructor(@Inject(CardOrchestrator) private readonly cardOrchestrator: CardOrchestrator) { }

    @UseGuards(OptionalAuthGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Req() req: AuthenticatedRequest,
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: string,
    ): Promise<CardViewDto> {
        const rawQuery = new QueryOptionsDto(req.query);
        this.LOGGER.debug(`Set listing options object: ${JSON.stringify(rawQuery)}`);
        return this.cardOrchestrator.findSetCard(req, setCode, setNumber, rawQuery);
    }
}
