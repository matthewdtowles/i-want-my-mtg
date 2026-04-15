import {
    Body,
    Controller,
    Delete,
    Get,
    Header,
    HttpCode,
    HttpStatus,
    Inject,
    Patch,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { PriceAlertService } from 'src/core/price-alert/price-alert.service';
import { PriceNotificationService } from 'src/core/price-alert/price-notification.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SealedProductService } from 'src/core/sealed-product/sealed-product.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { JwtAuthGuard } from 'src/http/auth/jwt.auth.guard';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { UpdatePasswordRequestDto } from 'src/http/hbs/user/dto/update-password.request.dto';
import { UpdateUserRequestDto } from 'src/http/hbs/user/dto/update-user.request.dto';
import { ApiResponseDto } from 'src/http/base/api-response.dto';
import { UserApiResponseDto } from './dto/user-response.dto';
import { UserExportDto } from './dto/user-export.dto';
import { ApiRateLimitGuard } from '../shared/api-rate-limit.guard';

@ApiTags('User')
@ApiBearerAuth()
@Controller('api/v1/user')
@UseGuards(JwtAuthGuard, ApiRateLimitGuard)
export class UserApiController {
    private static readonly EXPORT_LIMIT = 100000;

    constructor(
        @Inject(UserService) private readonly userService: UserService,
        @Inject(InventoryService) private readonly inventoryService: InventoryService,
        @Inject(TransactionService) private readonly transactionService: TransactionService,
        @Inject(PriceAlertService) private readonly priceAlertService: PriceAlertService,
        @Inject(PriceNotificationService)
        private readonly priceNotificationService: PriceNotificationService,
        @Inject(SealedProductService)
        private readonly sealedProductService: SealedProductService
    ) {}

    @Get()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'User profile' })
    async getProfile(
        @Req() req: AuthenticatedRequest
    ): Promise<ApiResponseDto<UserApiResponseDto>> {
        const user = await this.userService.findById(req.user.id);
        return ApiResponseDto.ok(this.toUserResponse(user));
    }

    @Get('export')
    @Header('Cache-Control', 'no-store')
    @ApiOperation({ summary: 'Export all personal data as JSON' })
    @ApiResponse({ status: 200, description: 'User data export' })
    async exportData(
        @Req() req: AuthenticatedRequest,
        @Res() res: Response
    ): Promise<void> {
        const userId = req.user.id;
        const fullOptions = new SafeQueryOptions({
            limit: String(UserApiController.EXPORT_LIMIT),
        });

        const [user, inventory, transactions, alerts, notifications, sealedInventory] =
            await Promise.all([
                this.userService.findById(userId),
                this.inventoryService.findAllForUser(userId, fullOptions),
                this.transactionService.findByUser(userId),
                this.priceAlertService.findByUser(userId, 1, UserApiController.EXPORT_LIMIT),
                this.priceNotificationService.findByUser(
                    userId,
                    1,
                    UserApiController.EXPORT_LIMIT
                ),
                this.sealedProductService.findInventoryForUser(userId, fullOptions),
            ]);

        const payload: UserExportDto = {
            exportedAt: new Date().toISOString(),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: String(user.role),
            },
            inventory: inventory.map((i) => ({
                cardId: i.cardId,
                isFoil: i.isFoil,
                quantity: i.quantity,
            })),
            transactions: transactions.map((t) => ({
                id: t.id,
                cardId: t.cardId,
                type: t.type,
                quantity: t.quantity,
                pricePerUnit: t.pricePerUnit,
                isFoil: t.isFoil,
                date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
                source: t.source,
                fees: t.fees,
                notes: t.notes,
                createdAt:
                    t.createdAt instanceof Date ? t.createdAt.toISOString() : undefined,
            })),
            priceAlerts: alerts.map((a) => ({
                id: a.id,
                cardId: a.cardId,
                increasePct: a.increasePct,
                decreasePct: a.decreasePct,
                isActive: a.isActive,
                lastNotifiedAt:
                    a.lastNotifiedAt instanceof Date ? a.lastNotifiedAt.toISOString() : null,
                createdAt:
                    a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt),
                updatedAt:
                    a.updatedAt instanceof Date ? a.updatedAt.toISOString() : String(a.updatedAt),
            })),
            priceNotifications: notifications.map((n) => ({
                id: n.id,
                cardId: n.cardId,
                alertId: n.alertId,
                direction: n.direction,
                oldPrice: n.oldPrice,
                newPrice: n.newPrice,
                changePct: n.changePct,
                isRead: n.isRead,
                createdAt:
                    n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
            })),
            sealedInventory: sealedInventory.map((s) => ({
                sealedProductUuid: s.sealedProductUuid,
                quantity: s.quantity,
            })),
        };

        const filename = `iwantmymtg-export-${new Date().toISOString().slice(0, 10)}.json`;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(HttpStatus.OK).send(JSON.stringify(payload, null, 2));
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
