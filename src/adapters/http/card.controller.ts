import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { CardDto } from 'src/core/card/dto/card.dto';
import { CreateCardDto } from 'src/core/card/dto/create-card.dto';
import { UpdateCardDto } from 'src/core/card/dto/update-card.dto';
import { CardServicePort } from 'src/core/card/ports/card.service.port';

@Controller('card')
export class CardController {

    constructor(
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
    ) { }


    @Post()
    async create(@Body() createCardDtos: CreateCardDto[]) {
        return await this.cardService.save(createCardDtos);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<CardDto> {
        return await this.cardService.findById(Number(id));
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateCardDtos: UpdateCardDto[]) {
        return await this.cardService.save(updateCardDtos);
    }

}
