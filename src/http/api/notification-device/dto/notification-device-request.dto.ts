import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export const DEVICE_PLATFORMS = ['ios', 'android', 'web'] as const;
// Rejects empty and whitespace-only tokens (`@IsNotEmpty` accepts "   ", which
// would then trim to "" in the service and persist a blank token row).
const NON_BLANK = /\S/;

export class RegisterDeviceApiDto {
    @ApiProperty({
        description: 'The Expo/APNs/FCM push token for this device.',
    })
    @IsString()
    @Matches(NON_BLANK, { message: 'token must not be blank' })
    readonly token: string;

    @ApiProperty({ enum: DEVICE_PLATFORMS, description: 'Device platform.' })
    @IsIn(DEVICE_PLATFORMS)
    readonly platform: (typeof DEVICE_PLATFORMS)[number];

    @ApiPropertyOptional({
        description: 'Optional client-supplied device identifier (metadata only).',
    })
    @IsOptional()
    @IsString()
    readonly deviceId?: string;
}

export class UnregisterDeviceApiDto {
    @ApiProperty({ description: 'The push token to remove (e.g. on sign-out).' })
    @IsString()
    @Matches(NON_BLANK, { message: 'token must not be blank' })
    readonly token: string;
}
