import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    Req,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/core/auth/auth.service';
import { User } from 'src/core/user/user.entity';
import { LocalAuthGuard } from 'src/http/auth/local.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { LoginRequestDto, LoginResponseDto, RefreshRequestDto } from './dto/auth-response.dto';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';
import { ApiOkEnvelope } from '../shared/api-ok-envelope.decorator';

@ApiTags('Auth')
@Controller('api/v1/auth')
@UseGuards(ApiRateLimitGuard)
export class AuthApiController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @Post('login')
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login and obtain access + refresh tokens' })
    @ApiOkEnvelope(LoginResponseDto, { description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() dto: LoginRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<LoginResponseDto>> {
        const tokens = await this.authService.loginWithRefresh(
            req.user as unknown as User,
            dto.deviceLabel
        );
        return ApiResponseDto.ok(tokens);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Exchange a refresh token for a new access token (rotates the refresh token)',
    })
    @ApiOkEnvelope(LoginResponseDto, { description: 'New access + refresh tokens' })
    @ApiResponse({ status: 401, description: 'Invalid, revoked, or expired refresh token' })
    async refresh(@Body() dto: RefreshRequestDto): Promise<ApiResponseDto<LoginResponseDto>> {
        const tokens = await this.authService.refresh(dto.refreshToken);
        if (!tokens) {
            throw new UnauthorizedException('Invalid or expired refresh token.');
        }
        return ApiResponseDto.ok(tokens);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revoke a refresh token (sign-out)' })
    @ApiResponse({ status: 200, description: 'Refresh token revoked' })
    async logout(@Body() dto: RefreshRequestDto): Promise<ApiResponseDto<{ revoked: boolean }>> {
        await this.authService.logout(dto.refreshToken);
        return ApiResponseDto.ok({ revoked: true });
    }
}
