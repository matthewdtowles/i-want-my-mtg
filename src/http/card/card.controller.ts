import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CreateCardDto } from './dtos/create-card.dto';
import { UpdateCardDto } from './dtos/update-card.dto';
import { Card } from 'src/core/card/card.entity';
import { CardMapper } from './card.mapper';
import { GetCardDto } from './dtos/get-card.dto';
import { CardServicePort } from 'src/core/card/ports/card.service.port';

@Controller('card')
export class CardController {
    constructor(
        private readonly cardService: CardServicePort,
        private readonly cardMapper: CardMapper,
    ) { }

    @Post()
    async create(@Body() createCardDto: CreateCardDto) {
        const card: Card = this.cardMapper.dtoToEntity(createCardDto);
        return this.cardService.create(card);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<GetCardDto> {
        const card: Card = await this.cardService.findById(id);
        return this.cardMapper.entityToDto( card);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
        const card: Card = this.cardMapper.updateDtoToEntity(updateCardDto);
        return this.cardService.update(card);
    }

}
