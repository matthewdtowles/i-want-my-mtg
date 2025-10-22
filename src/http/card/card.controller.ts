import {
    Controller,
    Get, Inject, Logger, Param,
    Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
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
        this.LOGGER.log(`Find set card ${setCode}/${setNumber}.`);
        const options = new SafeQueryOptions(req.query);
        const card = await this.cardOrchestrator.findSetCard(req, setCode, setNumber, options);
        this.LOGGER.log(`Found set card ${setCode}/${setNumber} -> ID: ${card?.card?.cardId}.`);
        return card;
    }
}
