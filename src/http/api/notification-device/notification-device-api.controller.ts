import {
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationDevice } from 'src/core/notification-device/notification-device.entity';
import { NotificationDeviceService } from 'src/core/notification-device/notification-device.service';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { JwtOrApiKeyGuard } from '../shared/jwt-or-api-key.guard';
import {
    RegisterDeviceApiDto,
    UnregisterDeviceApiDto,
} from './dto/notification-device-request.dto';
import { NotificationDeviceApiDto } from './dto/notification-device-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/v1/notifications/devices')
@UseGuards(JwtOrApiKeyGuard, ApiRateLimitGuard)
export class NotificationDeviceApiController {
    constructor(
        @Inject(NotificationDeviceService)
        private readonly deviceService: NotificationDeviceService
    ) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Register (or refresh) this device's push token for the authenticated user",
    })
    @ApiOkEnvelope(NotificationDeviceApiDto, { description: 'Device registered' })
    async register(
        @Body() dto: RegisterDeviceApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<NotificationDeviceApiDto>> {
        const device = await this.deviceService.register(
            req.user.id,
            dto.token,
            dto.platform,
            dto.deviceId
        );
        return ApiResponseDto.ok(this.toDto(device));
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Unregister a device's push token (e.g. on sign-out)" })
    @ApiResponse({ status: 200, description: 'Device unregistered' })
    async unregister(
        @Body() dto: UnregisterDeviceApiDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ unregistered: boolean }>> {
        const unregistered = await this.deviceService.unregister(req.user.id, dto.token);
        return ApiResponseDto.ok({ unregistered });
    }

    private toDto(device: NotificationDevice): NotificationDeviceApiDto {
        return {
            id: device.id,
            platform: device.platform,
            deviceId: device.deviceId,
            createdAt: device.createdAt.toISOString(),
        };
    }
}
