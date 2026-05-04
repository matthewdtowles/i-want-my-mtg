import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
    @ApiProperty({ description: 'User-supplied label for the key', maxLength: 64 })
    @IsString()
    @MaxLength(64)
    name: string;
}
