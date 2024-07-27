import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from '../../http/card/card.controller';

@Module({
  controllers: [CardController],
  providers: [CardService],
})
export class CardModule {}
