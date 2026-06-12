import { GranularPrice } from 'src/core/card/granular-price.entity';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { bestBuylistOffer } from './buylist.policy';

/**
 * Market sell value policy (Phase 6.4): match a user's inventory against
 * current buylist offers and produce a sell plan — the best offer per item
 * (qty-capped payout), grouped by vendor, with overall totals.
 *
 * Pure in-memory policy: callers fetch the inventory and the offers; this
 * decides what they are worth. An inventory item matches offers on its card
 * and finish only (isFoil -> 'foil', else 'normal'; 'etched' is a distinct
 * product the inventory does not model). NM-only via bestBuylistOffer.
 */

export interface SellPlanItem {
    readonly inventory: Inventory;
    /** Best (highest NM) offer for this item's card + finish. */
    readonly offer: GranularPrice;
    /** Units the vendor would take: min(owned, vendor buy qty); owned when qty unknown. */
    readonly sellableQuantity: number;
    /** True when the vendor's buy quantity caps below the owned quantity. */
    readonly quantityCapped: boolean;
    /** offer.price * sellableQuantity */
    readonly payout: number;
}

export interface VendorSellGroup {
    readonly provider: string;
    readonly items: SellPlanItem[];
    readonly payout: number;
}

export interface SellPlan {
    /** Sorted by payout descending; items within a group likewise. */
    readonly groups: VendorSellGroup[];
    readonly totalPayout: number;
    readonly itemsWithOffers: number;
    readonly itemsWithoutOffers: number;
}

const FINISH_BY_FOIL: Record<string, string> = { false: 'normal', true: 'foil' };

export function buildSellPlan(items: Inventory[], offers: GranularPrice[]): SellPlan {
    const offersBySeries = new Map<string, GranularPrice[]>();
    for (const offer of offers) {
        const key = `${offer.cardId}|${offer.finish}`;
        const series = offersBySeries.get(key);
        if (series) series.push(offer);
        else offersBySeries.set(key, [offer]);
    }

    const groupsByProvider = new Map<string, SellPlanItem[]>();
    let itemsWithOffers = 0;
    let itemsWithoutOffers = 0;

    for (const item of items) {
        if (item.quantity <= 0) continue;
        const finish = FINISH_BY_FOIL[String(item.isFoil)];
        const candidates = offersBySeries.get(`${item.cardId}|${finish}`) ?? [];
        const offer = bestBuylistOffer(candidates);
        if (!offer) {
            itemsWithoutOffers++;
            continue;
        }
        const sellableQuantity =
            offer.qty != null ? Math.min(item.quantity, offer.qty) : item.quantity;
        if (sellableQuantity <= 0) {
            itemsWithoutOffers++;
            continue;
        }
        itemsWithOffers++;
        const planItem: SellPlanItem = {
            inventory: item,
            offer,
            sellableQuantity,
            quantityCapped: sellableQuantity < item.quantity,
            payout: (offer.price as number) * sellableQuantity,
        };
        const group = groupsByProvider.get(offer.provider);
        if (group) group.push(planItem);
        else groupsByProvider.set(offer.provider, [planItem]);
    }

    const groups: VendorSellGroup[] = [...groupsByProvider.entries()]
        .map(([provider, groupItems]) => ({
            provider,
            items: groupItems.sort((a, b) => b.payout - a.payout),
            payout: groupItems.reduce((sum, i) => sum + i.payout, 0),
        }))
        .sort((a, b) => b.payout - a.payout);

    return {
        groups,
        totalPayout: groups.reduce((sum, g) => sum + g.payout, 0),
        itemsWithOffers,
        itemsWithoutOffers,
    };
}
