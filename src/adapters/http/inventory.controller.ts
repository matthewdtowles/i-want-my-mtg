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
import { ActionStatus, InventoryHttpDto } from "src/adapters/http/http.types";
import { InventoryCardAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { AggregatorServicePort } from "src/core/aggregator/api/aggregator.service.port";
import { InventoryDto } from "src/core/inventory/api/inventory.dto";
import { InventoryServicePort } from "src/core/inventory/api/inventory.service.port";
import { AuthenticatedRequest } from "./auth/auth.types";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";


@Controller("inventory")
export class InventoryController {
    private readonly LOGGER: Logger = new Logger(InventoryController.name);

    constructor(
        @Inject(InventoryServicePort) private readonly inventoryService: InventoryServicePort,
        @Inject(AggregatorServicePort) private readonly aggregatorService: AggregatorServicePort,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("inventory")
    async findByUser(@Req() req: AuthenticatedRequest): Promise<InventoryHttpDto> {
        this.LOGGER.debug(`Find user inventory`);
        this.validateAuthenticatedRequest(req);
        const _cards: InventoryCardAggregateDto[] = await this.aggregatorService.findByUser(req.user.id);
        const _username = req.user.name;
        return {
            authenticated: req.isAuthenticated(),
            breadcrumbs: [
                { label: "Home", url: "/" },
                { label: "Inventory", url: "/inventory" },
            ],
            cards: _cards,
            message: _cards ? `Inventory for ${_username} found` : `Inventory not found for ${_username}`,
            status: _cards ? ActionStatus.SUCCESS : ActionStatus.ERROR,
            username: _username,
            value: 0,// TODO: calculate value as sum of all prices
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
        const createdItems: InventoryDto[] = await this.inventoryService.create(updatedDtos);
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
        const completeDtos = updateInventoryDtos.map(dto => ({
            ...dto,
            userId: req.user.id,
        }));
        const updatedInventory: InventoryDto[] = await this.inventoryService.update(completeDtos);
        return res.status(HttpStatus.OK).json({
            message: `Updated inventory`,
            inventory: updatedInventory,
        });
    }

    @UseGuards(JwtAuthGuard)
    @Delete()
    async delete(
        @Body('cardId') _cardId: number,
        @Body('isFoil') isFoil: boolean,
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        this.LOGGER.debug(`Delete inventory item`);
        this.validateAuthenticatedRequest(req);
        if (!_cardId) throw new BadRequestException("Card ID not found in request");
        await this.inventoryService.delete(req.user.id, _cardId, isFoil);
        return res.status(HttpStatus.OK).json({
            message: `Deleted inventory item`,
            cardId: _cardId,
        });
    }

    private validateAuthenticatedRequest(req: AuthenticatedRequest): void {
        if (!req) throw new NotFoundException("Request not found");
        if (!req.user) throw new NotFoundException("User not found in request");
        if (!req.user.id) throw new NotFoundException("User does not have valid ID");
    }
}