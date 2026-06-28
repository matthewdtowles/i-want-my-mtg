import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePriceAlertDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    readonly cardId: string;

    @ApiPropertyOptional({
        minimum: 0.01,
        description:
            'Alert when the price rises by at least this percent. At least one of increasePct/decreasePct is required.',
    })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly increasePct?: number;

    @ApiPropertyOptional({
        minimum: 0.01,
        description:
            'Alert when the price falls by at least this percent. At least one of increasePct/decreasePct is required.',
    })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly decreasePct?: number;
}

export class UpdatePriceAlertDto {
    @ApiPropertyOptional({ minimum: 0.01, nullable: true, description: 'Set null to clear the rise threshold.' })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly increasePct?: number | null;

    @ApiPropertyOptional({ minimum: 0.01, nullable: true, description: 'Set null to clear the fall threshold.' })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    readonly decreasePct?: number | null;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    readonly isActive?: boolean;
}
