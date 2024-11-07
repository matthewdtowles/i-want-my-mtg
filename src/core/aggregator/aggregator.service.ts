import { Inject, Injectable, Logger } from "@nestjs/common";
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

    async findInventorySetByCode(
        setCode: string,
        userId: number
    ): Promise<InventorySetAggregateDto> {
        const set: SetDto = await this.setService.findByCode(setCode);
        if (!set) {
            throw new Error(`Set with code ${setCode} not found`);
        }
        if (!set.cards || set.cards.length === 0) {
            throw new Error(`Set with code ${setCode} has no cards`);
        }
        const inventoryCards: InventoryCardDto[] = await this.inventoryService
            .findAllCardsForUser(userId);
        const setInventoryCards: InventoryCardDto[] = inventoryCards
            ? inventoryCards.filter(item => item.card.setCode === setCode) : [];
        const updatedSetCards: InventoryCardAggregateDto[] = set.cards.map(card => {
            const inventoryItem = setInventoryCards.find(inv => inv.card.id === card.id);
            return {
                ...card,
                quantity: inventoryItem ? inventoryItem.quantity : 0,
            };
        });
        return {
            ...set,
            cards: updatedSetCards,
        };
    }

    async findInventoryCardById(
        cardId: number,
        userId: number
    ): Promise<InventoryCardAggregateDto> {
        const card = await this.cardService.findById(cardId);
        if (!card) {
            throw new Error(`Card with id ${cardId} not found`);
        }
        const inventoryItem: InventoryDto = await this.inventoryService.findOneForUser(userId, cardId);
        const foundCard: InventoryCardAggregateDto = {
            ...card,
            quantity: inventoryItem ? inventoryItem.quantity : 0,
        };
        this.LOGGER.debug(`Found card ${JSON.stringify(foundCard)} for user ${userId}`);
        return foundCard;
    }

    async findInventoryCardBySetNumber(
        setCode: string,
        cardNumber: number,
        userId: number
    ): Promise<InventoryCardAggregateDto> {
        const card = await this.cardService.findBySetCodeAndNumber(setCode, cardNumber);
        if (!card) {
            throw new Error(`Card #${cardNumber} in set ${setCode} not found`);
        }
        const inventoryItem: InventoryDto = await this.inventoryService.findOneForUser(userId, card.id);
        const foundCard: InventoryCardAggregateDto = {
            ...card,
            quantity: inventoryItem ? inventoryItem.quantity : 0,
        };
        this.LOGGER.debug(`Found card ${JSON.stringify(foundCard)} for user ${userId}`);
        return foundCard;
    }
}