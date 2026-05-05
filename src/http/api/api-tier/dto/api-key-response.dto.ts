import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: string;

    @ApiProperty({ description: 'Visible key prefix (iwm_live_ + first 4 chars)' })
    keyPrefix: string;

    @ApiPropertyOptional({ nullable: true })
    lastUsedAt: string | null;

    @ApiPropertyOptional({ nullable: true })
    revokedAt: string | null;

    @ApiProperty()
    createdAt: string;
}

export class CreatedApiKeyDto extends ApiKeyDto {
    @ApiProperty({
        description: 'Raw key. Shown ONCE at creation; cannot be retrieved later.',
    })
    rawKey: string;
}
