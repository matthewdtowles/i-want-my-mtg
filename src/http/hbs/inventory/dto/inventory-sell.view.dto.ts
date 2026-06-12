import { BaseViewDto } from 'src/http/base/base.view.dto';

/** One inventory item with its best current buylist offer (6.4). */
export interface SellItemView {
    /** Checkbox value posted to the CSV export: `cardId:n` | `cardId:f`. */
    key: string;
    name: string;
    /** Card detail page URL. */
    url: string;
    setCode: string;
    isFoil: boolean;
    quantity: number;
    sellableQuantity: number;
    /** True when the vendor's buy quantity caps below the owned quantity. */
    quantityCapped: boolean;
    offerPrice: string; // formatted, e.g. '$3.50'
    payout: string; // formatted
    payoutRaw: number;
    /** Vendor's public buylist-search URL for this card; null if unknown. */
    vendorUrl: string | null;
}

/** All items whose best offer comes from one vendor, with the vendor subtotal. */
export interface SellVendorGroupView {
    vendor: string; // display name
    payout: string; // formatted subtotal
    payoutRaw: number;
    itemCount: number;
    items: SellItemView[];
}

export class InventorySellViewDto extends BaseViewDto {
    readonly username: string;
    readonly totalSellValue: string;
    readonly itemsWithOffers: number;
    readonly itemsWithoutOffers: number;
    readonly hasOffers: boolean;
    readonly hasInventory: boolean;
    readonly vendorGroups: SellVendorGroupView[];

    constructor(init: Partial<InventorySellViewDto>) {
        super(init);
        this.username = init.username || '';
        this.totalSellValue = init.totalSellValue || '$0.00';
        this.itemsWithOffers = init.itemsWithOffers || 0;
        this.itemsWithoutOffers = init.itemsWithoutOffers || 0;
        this.hasOffers = init.hasOffers || false;
        this.hasInventory = init.hasInventory || false;
        this.vendorGroups = init.vendorGroups || [];
    }
}
