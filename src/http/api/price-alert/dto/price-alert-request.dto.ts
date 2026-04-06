import { IsBoolean, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePriceAlertDto {
    @IsUUID()
    readonly cardId: string;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly increasePct?: number;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly decreasePct?: number;
}

export class UpdatePriceAlertDto {
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly increasePct?: number | null;

    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly decreasePct?: number | null;

    @IsOptional()
    @IsBoolean()
    readonly isActive?: boolean;
}
