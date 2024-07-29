import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CardService } from '../../core/card/card.service';
import { CreateCardDto } from './dtos/create-card.dto';
import { UpdateCardDto } from './dtos/update-card.dto';
import { Card } from 'src/core/card/card.entity';
import { CardMapper } from './card.mapper';
import { GetCardDto } from './dtos/get-card.dto';

@Controller('card')
export class CardController {
  constructor(
    private readonly cardService: CardService,
    private readonly cardMapper: CardMapper,
  ) {}

  @Post()
  create(@Body() createCardDto: CreateCardDto) {
    const card: Card = this.cardMapper.dtoToEntity(createCardDto);
    return this.cardService.create(card);
  }

  @Get(':id')
  findOne(@Param('id') id: string): GetCardDto {
    return this.cardMapper.entityToDto(this.cardService.findById(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
    const card: Card = this.cardMapper.updateDtoToEntity(updateCardDto);
    return this.cardService.update(card);
  }

}
