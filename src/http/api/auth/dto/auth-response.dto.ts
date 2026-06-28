import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginRequestDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    @IsNotEmpty()
    readonly email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    readonly password: string;

    @ApiPropertyOptional({
        description:
            'Optional client/device label stored with the refresh token so a user can tell their sessions apart.',
        example: 'iPhone 15',
    })
    @IsOptional()
    @IsString()
    readonly deviceLabel?: string;
}

export class LoginResponseDto {
    @ApiProperty({ description: 'Short-lived JWT for the Authorization header.' })
    readonly accessToken: string;

    @ApiProperty({
        description:
            'Long-lived opaque token. Exchange it at POST /api/v1/auth/refresh for a new access token; rotated on each use.',
    })
    readonly refreshToken: string;
}

export class RefreshRequestDto {
    @ApiProperty({ description: 'The refresh token issued at login (or the previous refresh call).' })
    @IsString()
    @IsNotEmpty()
    readonly refreshToken: string;
}
