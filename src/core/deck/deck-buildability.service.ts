import { Inject, Injectable } from '@nestjs/common';
import { BuyListService } from 'src/core/buy-list/buy-list.service';
import { InventoryRepositoryPort } from 'src/core/inventory/ports/inventory.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { DeckCard } from './deck-card.entity';
import { DeckGapPolicy, DeckGapSummary } from './deck-gap.policy';
import { Deck } from './deck.entity';

@Injectable()
export class DeckBuildabilityService {
    private readonly LOGGER = getLogger(DeckBuildabilityService.name);

    constructor(
        @Inject(InventoryRepositoryPort)
        private readonly inventoryRepository: InventoryRepositoryPort,
        @Inject(BuyListService) private readonly buyListService: BuyListService
    ) {}

    /** Inventory quantities summed by lowercased card name (name-level matching). */
    async ownedByName(userId: number): Promise<Map<string, number>> {
        const map = new Map<string, number>();
        if (!userId) {
            return map;
        }
        const items = await this.inventoryRepository.findAllForExport(userId);
        for (const item of items) {
            const name = item.card?.name?.toLowerCase();
            if (!name) continue;
            map.set(name, (map.get(name) ?? 0) + item.quantity);
        }
        return map;
    }

    /** Gap for one deck's cards against the user's inventory. */
    async gapForDeck(cards: DeckCard[], userId: number): Promise<DeckGapSummary> {
        return DeckGapPolicy.compute(cards, await this.ownedByName(userId));
    }

    /** Buildability summary per deck id (one inventory load), for list ranking. */
    async summariesForDecks(decks: Deck[], userId: number): Promise<Map<number, DeckGapSummary>> {
        const owned = await this.ownedByName(userId);
        const out = new Map<number, DeckGapSummary>();
        for (const deck of decks) {
            if (deck.id != null) {
                out.set(deck.id, DeckGapPolicy.compute(deck.cards ?? [], owned));
            }
        }
        return out;
    }

    /** Seed the user's buy-list with the cards missing from a deck. Returns count added. */
    async addMissingToBuyList(cards: DeckCard[], userId: number): Promise<number> {
        const gap = await this.gapForDeck(cards, userId);
        // Each add is an independent atomic upsert on a distinct card, so run them
        // together instead of one serial round trip per missing card (P1).
        await Promise.all(
            gap.missingByCard.map(({ cardId, quantity }) =>
                this.buyListService.add(userId, cardId, false, quantity)
            )
        );
        this.LOGGER.debug(`seeded buy-list with ${gap.missingByCard.length} cards for user ${userId}.`);
        return gap.missingByCard.length;
    }
}
