import { Injectable } from '@nestjs/common';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Injectable()
export class CardService {

    create(createCardDto: CreateCardDto) {
        return 'This action adds a new card';
    }

    findAll() {
        return `This action returns all card`;
    }

    findOne(id: number) {
        return `This action returns a #${id} card`;
    }

    update(id: number, updateCardDto: UpdateCardDto) {
        return `This action updates a #${id} card`;
    }

    remove(id: number) {
        return `This action removes a #${id} card`;
    }

    // #range
    // TODO: move to FRONT END MODULE for CARD
    private readonly CARD_IMAGE_PROVIDER_URL: string = 'https://cards.scryfall.io/';
    private readonly CARD_IMAGE_PROVIDER_FORMATS: string[] = ["small", "normal", "large", "art_crop"];
    private readonly CARD_IMAGE_PROVIDER_SIDES: string[] = ["front", "back"];

    // https://cards.scryfall.io/{{img.format}}/{{img.side}}/{{scryfallId[0]}}/{{scryfallId[1]}}/{{scryfallId}}.jpg
    /*https://cards.scryfall.io/normal/front/6/d/6da045f8-6278-4c84-9d39-025adf0789c1.jpg */
    private buildManaCost(manaCost: string): string[] {
        return manaCost != null ? manaCost
            .toLowerCase()
            .replaceAll('/', '')
            .replace('{', '')
            .replaceAll('}', '')
            .split('{')
            : null;
    }
    // #endrange
}
