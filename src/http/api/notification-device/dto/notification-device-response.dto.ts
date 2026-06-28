import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationDeviceApiDto {
    @ApiProperty()
    readonly id: number;

    @ApiProperty({ enum: ['ios', 'android', 'web'] })
    readonly platform: string;

    @ApiPropertyOptional({ nullable: true })
    readonly deviceId?: string | null;

    @ApiProperty({ description: 'When the device was first registered.' })
    readonly createdAt: string;
}
