import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 400 response body returned when a list endpoint receives an invalid filter
 * value (unknown rarity/format/legality/sort, malformed setCode, or invalid
 * transaction type). Shapes the contract documented in the OpenAPI spec.
 */
export class QueryValidationErrorDto {
    @ApiProperty({ example: false })
    readonly success: boolean;

    @ApiProperty({
        example:
            "Invalid value 'foobar' for query parameter 'rarity'. Allowed values: common, uncommon, rare, mythic.",
    })
    readonly error: string;

    @ApiProperty({ example: 'rarity', description: 'The offending query parameter.' })
    readonly param: string;

    @ApiPropertyOptional({
        type: [String],
        example: ['common', 'uncommon', 'rare', 'mythic'],
        description: 'Accepted values, present when the parameter is an enumerated filter.',
    })
    readonly allowedValues?: string[];
}
