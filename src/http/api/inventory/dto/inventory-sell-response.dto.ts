import { ApiProperty } from '@nestjs/swagger';

export class SellPlanItemApiDto {
    @ApiProperty()
    readonly cardId: string;

    @ApiProperty({ required: false })
    readonly cardName?: string;

    @ApiProperty({ required: false })
    readonly setCode?: string;

    @ApiProperty({ required: false })
    readonly number?: string;

    @ApiProperty({ description: "'normal' | 'foil'" })
    readonly finish: string;

    @ApiProperty({ description: 'Quantity owned' })
    readonly ownedQuantity: number;

    @ApiProperty({ description: 'Units the vendor would take (qty-capped)' })
    readonly sellableQuantity: number;

    @ApiProperty({ description: 'True when the vendor buy quantity caps below owned' })
    readonly quantityCapped: boolean;

    @ApiProperty({ description: 'Best NM buylist offer per unit (USD)' })
    readonly offer: number;

    @ApiProperty({ description: 'offer * sellableQuantity (USD)' })
    readonly payout: number;
}

export class SellPlanGroupApiDto {
    @ApiProperty({ example: 'cardkingdom' })
    readonly provider: string;

    @ApiProperty({ example: 'Card Kingdom' })
    readonly vendor: string;

    @ApiProperty({ description: 'Sum of item payouts in this group (USD)' })
    readonly payout: number;

    @ApiProperty({ type: [SellPlanItemApiDto] })
    readonly items: SellPlanItemApiDto[];
}

export class InventorySellApiResponseDto {
    @ApiProperty({ description: 'Total market sell value across all groups (USD)' })
    readonly totalPayout: number;

    @ApiProperty({ description: 'Inventory items with a usable offer' })
    readonly itemsWithOffers: number;

    @ApiProperty({ description: 'Inventory items with no usable offer' })
    readonly itemsWithoutOffers: number;

    @ApiProperty({ type: [SellPlanGroupApiDto], description: 'Sorted by payout descending' })
    readonly groups: SellPlanGroupApiDto[];
}
