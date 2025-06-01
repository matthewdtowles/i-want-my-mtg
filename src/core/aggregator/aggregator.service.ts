import { Inject, Injectable, Logger } from "@nestjs/common";
import { CardDto } from "src/core/card/api/card.dto";
import { CardImgType } from "src/core/card/api/card.img.type.enum";
import { CardServicePort } from "src/core/card/api/card.service.port";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";
import { toDollar } from "src/shared/utils/formatting.util";
import {
    InventoryCardAggregateDto,
    InventoryCardVariant,
    InventorySetAggregateDto,
    VariantType
} from "./api/aggregate.dto";
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
        const inventoryCards: InventoryDto[] = await this.inventoryService.findAllCardsForUser(userId);
        const cards: InventoryCardAggregateDto[] = [];
        for (const item of inventoryCards) {
            const card: CardDto = await this.cardService.findById(item.card.id, CardImgType.NORMAL);
            cards.push({
                ...card,
                variants: [{
                    displayValue: item.isFoil ? toDollar(card.prices[0]?.foil) : toDollar(card.prices[0]?.normal),
                    quantity: item.quantity,
                    type: item.isFoil ? VariantType.FOIL : VariantType.NORMAL,
                }]
            });
        }
        return cards;
    }

    async findInventorySetByCode(setCode: string, userId: number): Promise<InventorySetAggregateDto> {
        this.LOGGER.debug(`findInventorySetByCode for set: ${setCode}, user: ${userId}`);
        const set: SetDto = await this.setService.findByCode(setCode);
        if (!set) throw new Error(`Set with code ${setCode} not found`);
        if (!set.cards || set.cards.length === 0) throw new Error(`Set with code ${setCode} has no cards`);
        const invCards: InventoryDto[] = await this.inventoryService.findAllCardsForUser(userId);
        const setInvCards: InventoryDto[] = invCards ? invCards.filter(item => item.card.setCode === setCode) : [];
        const updatedSetCards: InventoryCardAggregateDto[] = set.cards.map(card => {
            const invItems: InventoryDto[] = setInvCards.filter(inv => inv.card.id === card.id);
            return this.mapInventoryCardAggregate(card, invItems);
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
        const inventoryItems: InventoryDto[] = await this.inventoryService.findForUser(userId, cardId);
        return this.mapInventoryCardAggregate(card, inventoryItems);
    }

    async findInventoryCardBySetNumber(
        setCode: string,
        cardNumber: string,
        userId: number,
    ): Promise<InventoryCardAggregateDto> {
        this.LOGGER.debug(`findInventoryCards for set: ${setCode}, card #: ${cardNumber}, user: ${userId}`);
        const card: CardDto = await this.cardService.findBySetCodeAndNumber(setCode, cardNumber, CardImgType.NORMAL);
        if (!card) throw new Error(`Card #${cardNumber} in set ${setCode} not found`);
        const inventoryItems: InventoryDto[] = await this.inventoryService.findForUser(userId, card.id);
        return this.mapInventoryCardAggregate(card, inventoryItems);
    }

    private mapInventoryCardAggregate(
        card: CardDto,
        inventoryItems: InventoryDto[] | InventoryDto[]
    ): InventoryCardAggregateDto {
        const variants: InventoryCardVariant[] = [];
        if (card.hasNonFoil) {
            const inv: InventoryDto | InventoryDto = inventoryItems.find(item => !item.isFoil);
            variants.push({
                displayValue: toDollar(card.prices[0]?.normal),
                quantity: inv ? inv.quantity : 0,
                type: VariantType.NORMAL,
            });
        }
        if (card.hasFoil) {
            const inv: InventoryDto | InventoryDto = inventoryItems.find(item => item.isFoil);
            variants.push({
                displayValue: toDollar(card.prices[0]?.foil),
                quantity: inv ? inv.quantity : 0,
                type: VariantType.FOIL,
            });
        }
        return {
            ...card,
            variants,
        };
    }
}