import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEVICE_PLATFORMS } from './notification-device-request.dto';

export class NotificationDeviceApiDto {
    @ApiProperty()
    readonly id: number;

    @ApiProperty({ enum: DEVICE_PLATFORMS })
    readonly platform: (typeof DEVICE_PLATFORMS)[number];

    @ApiPropertyOptional({ nullable: true })
    readonly deviceId?: string | null;

    @ApiProperty({ description: 'When the device was first registered.' })
    readonly createdAt: string;
}
