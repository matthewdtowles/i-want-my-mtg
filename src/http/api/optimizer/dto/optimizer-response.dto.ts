import { ApiProperty } from '@nestjs/swagger';

export class OptimizerBuyLineApiDto {
    @ApiProperty()
    readonly name: string;

    @ApiProperty()
    readonly setCode: string;

    @ApiProperty()
    readonly number: string;

    @ApiProperty({ description: "'normal' | 'foil'" })
    readonly finish: string;

    @ApiProperty()
    readonly quantity: number;

    @ApiProperty({ nullable: true, description: 'Unit retail (USD); null when no price is known' })
    readonly unitPrice: number | null;

    @ApiProperty({ nullable: true, description: 'unitPrice * quantity (USD); null when no price' })
    readonly lineTotal: number | null;
}

export class OptimizerApiResponseDto {
    @ApiProperty({ example: 'Card Kingdom' })
    readonly vendor: string;

    @ApiProperty({ description: 'Store-credit bonus as a fraction (0.30 = +30%)', example: 0.3 })
    readonly bonusPct: number;

    @ApiProperty({ description: 'Buylist cash payout for the sell list (USD)' })
    readonly cashValue: number;

    @ApiProperty({ description: 'Store credit offered: cashValue * (1 + bonusPct)' })
    readonly storeCredit: number;

    @ApiProperty({ description: 'Retail cost of the priced buy-list lines (USD)' })
    readonly buyListRetail: number;

    @ApiProperty({ description: 'True when store credit beats cash for acquiring the buy list' })
    readonly recommendCredit: boolean;

    @ApiProperty({ description: 'Out-of-pocket saved by taking credit instead of cash (USD)' })
    readonly creditAdvantage: number;

    @ApiProperty({ description: 'Out-of-pocket to buy the list with cash: max(0, R - C)' })
    readonly cashOutOfPocket: number;

    @ApiProperty({ description: 'Out-of-pocket to buy the list with credit: max(0, R - C(1+b))' })
    readonly creditOutOfPocket: number;

    @ApiProperty({ description: 'Liquid cash kept if C exceeds the buy list: max(0, C - R)' })
    readonly cashLeftover: number;

    @ApiProperty({ description: 'Credit left after the buy list, spendable only at the vendor' })
    readonly lockedCredit: number;

    @ApiProperty({ description: 'Cards on the sell list (the CK vendor group)' })
    readonly sellItemCount: number;

    @ApiProperty({ description: 'Buy-list lines with no current price (excluded from retail)' })
    readonly itemsWithoutPrice: number;

    @ApiProperty({ type: [OptimizerBuyLineApiDto] })
    readonly buyLines: OptimizerBuyLineApiDto[];
}
