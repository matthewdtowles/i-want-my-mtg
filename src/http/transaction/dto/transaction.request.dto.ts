import {
    IsBoolean,
    IsDateString,
    IsIn,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class TransactionRequestDto {
    @IsString()
    readonly cardId: string;

    @IsIn(['BUY', 'SELL'])
    readonly type: 'BUY' | 'SELL';

    @IsInt()
    @Min(1)
    readonly quantity: number;

    @IsNumber()
    @Min(0)
    readonly pricePerUnit: number;

    @IsBoolean()
    readonly isFoil: boolean;

    @IsDateString()
    readonly date: string;

    @IsOptional()
    @IsString()
    readonly source?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    readonly fees?: number;

    @IsOptional()
    @IsString()
    readonly notes?: string;
}
