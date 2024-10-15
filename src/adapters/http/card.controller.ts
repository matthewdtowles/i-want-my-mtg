import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Render,
} from "@nestjs/common";
import { CardDto } from "src/core/card/dto/card.dto";
import { CreateCardDto } from "src/core/card/dto/create-card.dto";
import { UpdateCardDto } from "src/core/card/dto/update-card.dto";
import { CardServicePort } from "src/core/card/ports/card.service.port";
import { Roles } from "./auth/roles.decorator";
import { UserRole } from "./auth/user.role";

@Controller("card")
export class CardController {
  private readonly LOGGER: Logger = new Logger(CardController.name);

  constructor(
    @Inject(CardServicePort) private readonly cardService: CardServicePort,
  ) {}

  @Post()
  @Roles(UserRole.Admin)
  async create(@Body() createCardDtos: CreateCardDto[]) {
    return await this.cardService.save(createCardDtos);
  }

  @Get(":id")
  async findOne(@Param("id") id: string): Promise<CardDto> {
    return await this.cardService.findById(Number(id));
  }

  @Patch(":id")
  @Roles(UserRole.Admin)
  async update(@Body() updateCardDtos: UpdateCardDto[]) {
    return await this.cardService.save(updateCardDtos);
  }

  @Get(":setCode/:setNumber")
  @Render("card")
  async findSetCard(
    @Param("setCode") setCode: string,
    @Param("setNumber") setNumber: number,
  ): Promise<CardDto> {
    this.LOGGER.debug(`findSetCard in set ${setCode}, and # ${setNumber}`);
    return await this.cardService.findBySetCodeAndNumber(setCode, setNumber);
  }
}
