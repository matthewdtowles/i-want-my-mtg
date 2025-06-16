import {
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Param, Render,
    Req,
    UseGuards
} from "@nestjs/common";
import { AuthenticatedRequest } from "src/adapters/http/auth/auth.types";
import { UserGuard } from "src/adapters/http/auth/user.guard";
import { CardViewDto } from "src/adapters/http/card/dto/card.view.dto";
import { CardService } from "src/core/card/card.service";
import { InventoryService } from "src/core/inventory/inventory.service";

@Controller("card")
export class CardController {
    private readonly LOGGER: Logger = new Logger(CardController.name);

    constructor(
        @Inject(CardService) private readonly cardService: CardService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
    ) { }

    @UseGuards(UserGuard)
    @Get(":id")
    @Render("card")
    async findOne(@Param("id") id: string, @Req() req: AuthenticatedRequest): Promise<CardViewDto> {

        // this.LOGGER.debug(`findOne ${id}`);
        // const userId = req.user ? req.user.id : 0;
        // let card: CardResponseDto;
        // if (userId > 0) {
        //     const inventoryDto: Inventory[] = await this.inventoryService.findForUser(userId, id);
        //     card = HttpPresenter.toCardResponseDto([coreCard]);
        // } else {
        //     const coreCard: Card = await this.cardService.findById(id);
        //     card = HttpPresenter.toCardResponseDto(coreCard);
        // }
        // const allPrintings: CardResponseDto[] = this.mapper.entitiesToDtos(await this.cardService.findAllWithName(card.name));

        // return {
        //     authenticated: req.isAuthenticated(),
        //     breadcrumbs: breadcrumbsForCard(card.setCode, card.name, card.number),
        //     card,
        //     message: HttpStatus.OK ? "Card found" : "Card not found",
        //     otherPrintings: allPrintings.filter((card: CardDto) => card.setCode !== card.setCode),
        //     status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        // };
        throw new Error("Card by ID not implemented yet");
    }

    @UseGuards(UserGuard)
    @Get(":setCode/:setNumber")
    @Render("card")
    async findSetCard(
        @Param("setCode") setCode: string,
        @Param("setNumber") setNumber: string,
        @Req() req: AuthenticatedRequest
    ): Promise<CardViewDto> {

        this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
        // const userId = req.user ? req.user.id : 0;
        // const _card: InventoryCardResponseDto = await this.inventoryService
        //     .findInventoryCardBySetNumber(setCode, setNumber, userId);
        // const allPrintings: CardDto[] = await this.cardService.findAllWithName(_card.name);

        // return {
        //     authenticated: req.isAuthenticated(),
        //     breadcrumbs: breadcrumbsForCard(_card.setCode, _card.name, _card.number),
        //     card: _card,
        //     message: HttpStatus.OK ? "Card found" : "Card not found",
        //     otherPrintings: allPrintings.filter((card: CardDto) => card.setCode !== setCode),
        //     status: HttpStatus.OK ? ActionStatus.SUCCESS : ActionStatus.ERROR,
        // };
        throw new Error("Card by set code and number not implemented yet");
    }
}
