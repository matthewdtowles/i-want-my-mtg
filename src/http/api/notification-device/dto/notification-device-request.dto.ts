import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const DEVICE_PLATFORMS = ['ios', 'android', 'web'] as const;

export class RegisterDeviceApiDto {
    @ApiProperty({
        description: 'The Expo/APNs/FCM push token for this device.',
    })
    @IsString()
    @IsNotEmpty()
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
    @IsNotEmpty()
    readonly token: string;
}
