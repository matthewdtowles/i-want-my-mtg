import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from 'src/core/auth/auth.service';
import { User } from 'src/core/user/user.entity';
import { LocalAuthGuard } from 'src/http/auth/local.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { LoginRequestDto, LoginResponseDto } from './dto/auth-response.dto';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

@ApiTags('Auth')
@Controller('api/v1/auth')
@UseGuards(ApiRateLimitGuard)
export class AuthApiController {
    constructor(@Inject(AuthService) private readonly authService: AuthService) {}

    @Post('login')
    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login and obtain JWT token' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() _dto: LoginRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<LoginResponseDto>> {
        const authToken = await this.authService.login(req.user as unknown as User);
        return ApiResponseDto.ok({ accessToken: authToken.access_token });
    }
}
