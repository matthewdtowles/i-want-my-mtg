import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsStrongPassword,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

export class RegisterRequestDto {
    @ApiProperty({ example: 'user@example.com', maxLength: 255 })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @MaxLength(255, { message: 'Email must be at most 255 characters' })
    readonly email: string;

    @ApiProperty({
        description:
            'Display name. Letters, numbers, spaces, hyphens, and underscores only.',
        example: 'planeswalker42',
        minLength: 6,
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty({ message: 'Username is required' })
    @MinLength(6, { message: 'Username must be at least 6 characters' })
    @MaxLength(50, { message: 'Username must be at most 50 characters' })
    @Matches(/^[a-zA-Z0-9 _-]+$/, {
        message: 'Username may only contain letters, numbers, spaces, hyphens, and underscores',
    })
    readonly name: string;

    @ApiProperty({
        description:
            'At least 8 characters with at least 1 uppercase, 1 lowercase, 1 number, and 1 special character.',
        example: 'Sup3rSecret!',
        maxLength: 128,
    })
    @IsNotEmpty({ message: 'Password is required' })
    @IsStrongPassword(
        {},
        {
            message:
                'Password must be at least 8 characters and contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
        }
    )
    @MaxLength(128, { message: 'Password must be at most 128 characters' })
    readonly password: string;
}

export class RegisterResponseDto {
    @ApiProperty({
        description:
            'A uniform acknowledgement shown regardless of whether the email was new, ' +
            'already registered, or already pending — the response never reveals which.',
    })
    readonly message: string;
}

export class VerifyEmailRequestDto {
    @ApiProperty({
        description: 'The raw verification token from the emailed link (its `token` query param).',
    })
    @IsString()
    @IsNotEmpty()
    readonly token: string;

    @ApiPropertyOptional({
        description: 'Optional device label stored with the refresh token issued on success.',
        example: 'iPhone 15',
    })
    @IsOptional()
    @IsString()
    readonly deviceLabel?: string;
}
