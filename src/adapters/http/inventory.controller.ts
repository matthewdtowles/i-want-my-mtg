import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Inject,
    Logger,
    Patch,
    Post,
    Render,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { InventoryCardDto, InventoryDto } from "src/core/inventory/dto/inventory.dto";
import { InventoryServicePort } from "src/core/inventory/ports/inventory.service.port";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";

@Controller("inventory")
export class InventoryController {
    private readonly LOGGER: Logger = new Logger(InventoryController.name);

    constructor(
        @Inject(InventoryServicePort) private readonly inventoryService: InventoryServicePort
    ) { }

    @UseGuards(JwtAuthGuard)
    @Get()
    @Render("inventory")
    async findByUser(@Req() req: AuthenticatedRequest) {
        if (!req.user) {
            throw new Error("User not found in request");
        }
        if (!req.user.id) {
            throw new Error("ID not found in request user");
        }
        const _inventory: InventoryCardDto[] = await this.inventoryService.findCardsByUser(req.user.id);
        this.LOGGER.debug(`inventory stringified: ${JSON.stringify(_inventory)}`);
        return {
            user: req.user,
            inventory: _inventory,
            value: 0, // TODO: Calculate the total value of the inventory
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post()
    async create(
        @Body() createInventoryDtos: InventoryDto[],
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        try {
            if (!req || !req.user || !req.user.id) {
                throw new Error("User not found in request");
            }
            const updatedDtos: InventoryDto[] = createInventoryDtos.map(dto => ({
                ...dto,
                userId: req.user.id,
            }));
            this.LOGGER.debug(`create ${JSON.stringify(updatedDtos)}`);
            const createdItems: InventoryDto[] = await this.inventoryService.create(updatedDtos);
            this.LOGGER.debug(`createdItems ${JSON.stringify(createdItems)}`);
            return res.status(HttpStatus.CREATED).json({
                message: `Added inventory items`,
                inventory: createdItems,
            });
        } catch (error) {
            return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ message: `Error adding items to inventory: ${error.message}` });
        }
    }

    @UseGuards(JwtAuthGuard)
    @Patch()
    async update(
        @Body() updateInventoryDtos: InventoryDto[],
        @Res() res: Response,
        @Req() req: AuthenticatedRequest,
    ) {
        this.LOGGER.debug(`update inventory called on ${JSON.stringify(updateInventoryDtos)}`);
        try {
            if (!req || !req.user || !req.user.id) {
                this.LOGGER.error(`User not found in request`);
                throw new Error("User not found in request");
            }
            this.LOGGER.debug(`mapping UpdateInventoryDto[] to include userId`);
            const completeDtos = updateInventoryDtos.map(dto => ({
                ...dto,
                userId: req.user.id,
            }));
            this.LOGGER.debug(`MAPPING COMPLETE --> update ${JSON.stringify(completeDtos)}`);
            const updatedInventory: InventoryDto[] = await this.inventoryService.update(completeDtos);
            this.LOGGER.debug(`updatedInventory ${JSON.stringify(updatedInventory)}`);
            return res.status(HttpStatus.OK).json({
                message: `Updated inventory`,
                inventory: updatedInventory,
            });
        } catch (error) {
            return res
                .status(HttpStatus.BAD_REQUEST)
                .json({ message: `Error updating inventory: ${error.message}` });
        }
    }
}
