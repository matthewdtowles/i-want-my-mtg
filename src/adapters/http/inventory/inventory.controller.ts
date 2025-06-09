import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Inject,
    Logger,
    NotFoundException,
    Patch,
    Post,
    Render,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { HttpPresenter } from "src/adapters/http/http.presenter";
import { ActionStatus, InventoryCardResponseDto, InventoryViewDto } from "src/adapters/http/http.types";
import { Inventory, InventoryService } from "src/core/inventory";
import { AuthenticatedRequest, } from "../auth/auth.types";
import { JwtAuthGuard } from "../auth/jwt.auth.guard";


@Controller("inventory")
export class InventoryController {
    private readonly LOGGER: Logger = new Logger(InventoryController.name);

    constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("inventory")
    async findByUser(@Req() req: AuthenticatedRequest): Promise<InventoryViewDto> {
        this.LOGGER.debug(`Find user inventory`);
        // TODO define HttpMapper function to map entire response
        this.validateAuthenticatedRequest(req);
        const inventoryItems: Inventory[] = await this.inventoryService.findAllCardsForUser(req.user.id);
        const cards: InventoryCardResponseDto[] = inventoryItems.map(item => HttpPresenter.toInventoryCardHttpDto(item));
        const username = req.user.name;
        const totalValue: string = "0.00";
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [
                { label: "Home", url: "/" },
                { label: "Inventory", url: "/inventory" },
            ],
            cards,
            message: cards ? `Inventory for ${username} found` : `Inventory not found for ${username}`,
            status: cards ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            username,
            totalValue,
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(
        @Body() createInventoryDtos: InventoryDto[],
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        this.LOGGER.debug(`Create inventory`);
        this.validateAuthenticatedRequest(req);
        const updatedDtos: InventoryDto[] = createInventoryDtos.map(dto => ({
            ...dto,
            userId: req.user.id,
        }));
        const createdItems: Inventory[] = await this.inventoryService.create(updatedDtos);
        return res.status(HttpStatus.CREATED).json({
            message: `Added inventory items`,
            inventory: createdItems,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() updateInventoryDtos: InventoryDto[],
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        this.LOGGER.debug(`Update inventory`);
        this.validateAuthenticatedRequest(req);
        const completeDtos: Inventory[] = updateInventoryDtos.map(dto => ({
            ...dto,
            userId: req.user.id,
        }));
        const updatedInventory: Inventory[] = await this.inventoryService.update(completeDtos);
        return res.status(HttpStatus.OK).json({
            message: `Updated inventory`,
            inventory: updatedInventory,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    async delete(
        @Body('cardId') cardId: string,
        @Body('isFoil') isFoil: boolean,
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        this.LOGGER.debug(`Delete inventory item`);
        this.validateAuthenticatedRequest(req);
        if (!cardId) throw new BadRequestException("Card ID not found in request");
        await this.inventoryService.delete(req.user.id, cardId, isFoil);
        return res.status(HttpStatus.OK).json({
            message: `Deleted inventory item`,
            cardId,
        });
    }

    private validateAuthenticatedRequest(req: AuthenticatedRequest): void {
        if (!req) throw new NotFoundException("Request not found");
        if (!req.user) throw new NotFoundException("User not found in request");
        if (!req.user.id) throw new NotFoundException("User does not have valid ID");
    }
}