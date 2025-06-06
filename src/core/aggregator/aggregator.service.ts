import { Inject, Injectable, Logger } from "@nestjs/common";
import { CardDto } from "src/core/card/api/card.dto";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { SetDto } from "src/core/set/api/set.dto";
import { SetServicePort } from "src/core/set/api/set.service.port";
import { toDollar } from "src/shared/utils/formatting.util";
import {
    InventoryCardAggregateDto,
    InventoryCardVariant,
    InventorySetAggregateDto
} from "./api/aggregate.dto";
import { AggregatorServicePort } from "./api/aggregator.service.port";

@Injectable()
export class AggregatorService implements AggregatorServicePort {

    private readonly LOGGER: Logger = new Logger(AggregatorService.name);

    constructor(
        @Inject(InventoryServicePort) private readonly inventoryService: InventoryServicePort,
        @Inject(SetServicePort) private readonly setService: SetServicePort,
    ) { }

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

    private mapInventoryCardAggregate(
        card: CardDto,
        inventoryItems: InventoryDto[] | InventoryDto[]
    ): InventoryCardAggregateDto {
        const variants: InventoryCardVariant[] = [];
        if (card.hasNonFoil) {
            const inv: InventoryDto = inventoryItems.find(item => !item.isFoil);
            variants.push({
                displayValue: toDollar(card.prices[0]?.normal),
                quantity: inv ? inv.quantity : 0,
                isFoil: false
            });
        }
        if (card.hasFoil) {
            const inv: InventoryDto = inventoryItems.find(item => item.isFoil);
            variants.push({
                displayValue: toDollar(card.prices[0]?.foil),
                quantity: inv ? inv.quantity : 0,
                isFoil: true
            });
        }
        return {
            ...card,
            variants,
        };
    }
}