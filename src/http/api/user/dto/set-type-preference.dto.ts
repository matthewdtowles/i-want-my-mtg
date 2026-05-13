import { ApiProperty } from '@nestjs/swagger';

export class SetTypePreferenceResponseDto {
    @ApiProperty({
        type: [String],
        nullable: true,
        description:
            'Selected set types. `null` means the user has not customized; the default list applies.',
    })
    readonly types: string[] | null;

    @ApiProperty({
        type: [String],
        description: 'Set types applied when no custom preference is saved.',
    })
    readonly default: string[];
}

export class UpdateSetTypePreferenceRequestDto {
    @ApiProperty({
        type: [String],
        nullable: true,
        description:
            'New set-type preference. Pass `null` to reset to the default list. Pass an array of known set-type strings to customize.',
    })
    readonly types: string[] | null;
}
