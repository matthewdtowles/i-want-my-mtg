import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Inject,
    Patch,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { UpdatePasswordRequestDto } from 'src/http/user/dto/update-password.request.dto';
import { UpdateUserRequestDto } from 'src/http/user/dto/update-user.request.dto';
import { ApiResponseDto } from '../dto/api-response.dto';
import { UserApiResponseDto } from '../dto/user-response.dto';
import { ApiRateLimitGuard } from '../guards/api-rate-limit.guard';

@ApiTags('User')
@ApiBearerAuth()
@Controller('api/v1/user')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
export class UserApiController {
    constructor(@Inject(UserService) private readonly userService: UserService) {}

    @Get()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile' })
    async getProfile(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<UserApiResponseDto>> {
        const user = await this.userService.findById(req.user.id);
        return ApiResponseDto.ok(this.toUserResponse(user));
    }

    @Patch()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated' })
    async updateProfile(
        @Body() dto: UpdateUserRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<UserApiResponseDto>> {
        const userToUpdate = new User({
            id: req.user.id,
            email: dto.email,
            name: dto.name,
        });
        const updated = await this.userService.update(userToUpdate);
        return ApiResponseDto.ok(this.toUserResponse(updated));
    }

    @Patch('password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update password' })
    @ApiResponse({ status: 200, description: 'Password updated' })
    async updatePassword(
        @Body() dto: UpdatePasswordRequestDto,
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ updated: boolean }>> {
        const user = await this.userService.findById(req.user.id);
        const success = await this.userService.updatePassword(user, dto.password);
        return ApiResponseDto.ok({ updated: success });
    }

    @Delete()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete account' })
    @ApiResponse({ status: 200, description: 'Account deleted' })
    async deleteAccount(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<{ deleted: boolean }>> {
        await this.userService.remove(req.user.id);
        return ApiResponseDto.ok({ deleted: true });
    }

    private toUserResponse(user: User): UserApiResponseDto {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
        };
    }
}
