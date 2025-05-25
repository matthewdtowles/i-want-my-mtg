import { Inject, Injectable, Logger } from "@nestjs/common";
import { CardDto } from "src/core/card/api/card.dto";
import { CardImgType } from "src/core/card/api/card.img.type.enum";
import { CardServicePort } from "../card/api/card.service.port";
import { InventoryCardDto, InventoryDto } from "../inventory/api/inventory.dto";
import { InventoryServicePort } from "../inventory/api/inventory.service.port";
import { SetDto } from "../set/api/set.dto";
import { SetServicePort } from "../set/api/set.service.port";
import { InventoryCardAggregateDto, InventorySetAggregateDto } from "./api/aggregate.dto";
import { AggregatorServicePort } from "./api/aggregator.service.port";

@Injectable()
export class AggregatorService implements AggregatorServicePort {

    private readonly LOGGER: Logger = new Logger(AggregatorService.name);

    constructor(
        @Inject(CardServicePort) private readonly cardService: CardServicePort,
        @Inject(InventoryServicePort) private readonly inventoryService: InventoryServicePort,
        @Inject(SetServicePort) private readonly setService: SetServicePort,
    ) { }

    async findByUser(userId: number): Promise<InventoryCardAggregateDto[]> {
        this.LOGGER.debug(`findByUser ${userId}`);
        const inventoryCards: InventoryCardDto[] = await this.inventoryService.findAllCardsForUser(userId);
        const cards: InventoryCardAggregateDto[] = [];
        for (const item of inventoryCards) {
            const card: CardDto = await this.cardService.findById(item.card.id, CardImgType.NORMAL);
            cards.push(this.createInventoryCardAggregate(card, item));
        }
        return cards;
    }

    async findInventorySetByCode(setCode: string, userId: number): Promise<InventorySetAggregateDto> {
        this.LOGGER.debug(`findInventorySetByCode for set: ${setCode}, user: ${userId}`);
        const set: SetDto = await this.setService.findByCode(setCode);
        if (!set) throw new Error(`Set with code ${setCode} not found`);
        if (!set.cards || set.cards.length === 0) throw new Error(`Set with code ${setCode} has no cards`);
        const inventoryCards: InventoryCardDto[] = await this.inventoryService.findAllCardsForUser(userId);
        const setInventoryCards: InventoryCardDto[] = inventoryCards
            ? inventoryCards.filter(item => item.card.setCode === setCode) : [];
        const updatedSetCards: InventoryCardAggregateDto[] = set.cards.map(card => {
            const inventoryItem: InventoryCardDto = setInventoryCards.find(inv => inv.card.id === card.id);
            return this.createInventoryCardAggregate(card, inventoryItem);
        });
        return {
            ...set,
            cards: updatedSetCards,
        };
    }

    async findInventoryCardById(cardId: number, userId: number): Promise<InventoryCardAggregateDto> {
        this.LOGGER.debug(`findInventoryCardById for card: ${cardId}, user: ${userId}`);
        const card: CardDto = await this.cardService.findById(cardId, CardImgType.SMALL);
        if (!card) throw new Error(`Card with id ${cardId} not found`);
        const inventoryItem: InventoryDto = await this.inventoryService.findOneForUser(userId, cardId);
        return this.createInventoryCardAggregate(card, inventoryItem);
    }

    async findInventoryCardBySetNumber(
        setCode: string,
        cardNumber: string,
        userId: number
    ): Promise<InventoryCardAggregateDto> {
        this.LOGGER.debug(`findInventoryCards for set: ${setCode}, card #: ${cardNumber}, user: ${userId}`);
        const card: CardDto = await this.cardService.findBySetCodeAndNumber(setCode, cardNumber, CardImgType.NORMAL);
        if (!card) throw new Error(`Card #${cardNumber} in set ${setCode} not found`);
        const inventoryItem: InventoryDto = await this.inventoryService.findOneForUser(userId, card.id);
        return this.createInventoryCardAggregate(card, inventoryItem);
    }

    // TODO: may need to export this logic to be available to all services using cards/prices!!!
    private createInventoryCardAggregate(
        card: CardDto,
        inventoryItem: InventoryDto | InventoryCardDto
    ): InventoryCardAggregateDto {
        const hasFoil = card.prices && card.prices.length > 0 && card.prices[0].foil;
        const hasNormal = card.prices && card.prices.length > 0 && card.prices[0].normal;
        let normal: string;
        let foil: string;
        if (hasFoil && hasNormal) {
            normal = card.prices[0].normal;
            foil = card.prices[0].foil;
        } else if (hasFoil && !hasNormal) {
            normal = foil = card.prices[0].foil;
        } else if (!hasFoil && hasNormal) {
            normal = card.prices[0].normal;
            foil = "--";
        } else {
            normal = foil = "--";
        }
        return {
            ...card,
            quantity: inventoryItem ? inventoryItem.quantity : 0,
            displayPrice: normal,
            foilDisplayPrice: foil,
        };
    }
}