import { ApiProperty } from '@nestjs/swagger';

export class BuylistOfferApiDto {
    @ApiProperty({ description: 'Provider key (granular_price.provider)', example: 'cardkingdom' })
    readonly provider: string;

    @ApiProperty({ description: 'Vendor display name', example: 'Card Kingdom' })
    readonly vendor: string;

    @ApiProperty({ description: 'Buylist offer in USD (NM)', example: 3.5 })
    readonly price: number;

    @ApiProperty({ description: 'Highest offer for this finish', example: true })
    readonly isBest: boolean;
}

export class BuylistFinishApiDto {
    @ApiProperty({ description: "Finish key: 'normal' | 'foil' | 'etched'", example: 'normal' })
    readonly finish: string;

    @ApiProperty({ type: BuylistOfferApiDto, description: 'Highest offer for this finish' })
    readonly best: BuylistOfferApiDto;

    @ApiProperty({ type: [BuylistOfferApiDto], description: 'All offers for this finish, best first' })
    readonly offers: BuylistOfferApiDto[];
}

export class CardBuylistApiResponseDto {
    @ApiProperty({ description: 'Card id' })
    readonly cardId: string;

    @ApiProperty({ type: [BuylistFinishApiDto], description: 'Usable NM buylist offers grouped by finish' })
    readonly finishes: BuylistFinishApiDto[];

    @ApiProperty({ description: 'True when any usable offer exists' })
    readonly hasAny: boolean;
}
