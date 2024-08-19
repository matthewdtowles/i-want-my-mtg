import { Controller, Get, Post, Body, Patch, Param, Inject } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardServicePort } from 'src/core/card/ports/card.service.port';
import { CardMapper } from 'src/core/card/card.mapper';
import { CardDto } from 'src/core/card/dto/card.dto';
import { CreateCardDto } from 'src/core/card/dto/create-card.dto';
import { UpdateCardDto } from 'src/core/card/dto/update-card.dto';

@Controller('card')
export class CardController {
    constructor(
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
    ) { }

    @Post()
    async create(@Body() createCardDto: CreateCardDto) {
        const card: Card = CardMapper.dtoToEntity(createCardDto);
        return this.cardService.save([card]);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<CardDto> {
        const card: Card = await this.cardService.findById(Number(id));
        return CardMapper.entityToDto( card);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
        const card: Card = CardMapper.updateDtoToEntity(updateCardDto);
        return this.cardService.save([card]);
    }

}
