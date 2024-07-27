import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CardService } from '../../core/card/card.service';
import { CreateCardDto } from './create-card.dto';
import { UpdateCardDto } from './update-card.dto';
import { Card } from 'src/core/card/entities/card.entity';
import { CardMapper } from './card.mapper';
import { GetCardDto } from './get-card.dto';

// TODO: route for /sets/${setCode}/${card.number}
// TODO: & rte for /cards/${card.name}
@Controller('card')
export class CardController {
  constructor(
    private readonly cardService: CardService,
    private readonly cardMapper: CardMapper,
  ) {}


  @Post()
  create(@Body() createCardDto: CreateCardDto) {
    const card: Card = this.cardMapper.createEntity(createCardDto);
    return this.cardService.create(card);
  }

  @Get()
  findAll() {
    return this.cardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): GetCardDto {
    return this.cardMapper.toEntity(this.cardService.findOne(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCardDto: UpdateCardDto) {
    const card: Card = this.cardMapper.updateEntity(updateCardDto);
    return this.cardService.update(card);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cardService.remove(id);
  }


}
