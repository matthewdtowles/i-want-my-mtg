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
import { InventoryDto } from "src/core/inventory/dto/inventory.dto";
import { UpdateInventoryDto } from "src/core/inventory/dto/update-inventory.dto";
import { InventoryServicePort } from "src/core/inventory/ports/inventory.service.port";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { CreateInventoryDto } from "src/core/inventory/dto/create-inventory.dto";

@Controller("inventory")
export class InventoryController {
  private readonly LOGGER: Logger = new Logger(InventoryController.name);

  constructor(
    @Inject(InventoryServicePort)
    private readonly inventoryService: InventoryServicePort,
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
    const _inventory: InventoryDto[] = await this.inventoryService.findByUser(
      req.user.id,
    );
    this.LOGGER.debug(`findByUser ${req.user.id}`);
    this.LOGGER.debug(`inventory size: ${_inventory.length}`);
    this.LOGGER.debug(`inventory stringified: ${JSON.stringify(_inventory)}`);
    return {
      user: req.user,
      inventory: _inventory,
      value: 0, // TODO: Calculate the total value of the inventory
    };
  }
/*
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() createInventoryDtos: CreateInventoryDto[],
    @Res() res: Response,
  ) {
    try {
      const createdInventory: InventoryDto[] =
        await this.inventoryService.create(createInventoryDtos);
      return res.status(HttpStatus.CREATED).json({
        message: `Added inventory items`,
        inventory: createdInventory,
      });
    } catch (error) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: `Error adding items to inventory: ${error.message}` });
    }
  }
*/
  @UseGuards(JwtAuthGuard)
  @Patch()
  async update(
    @Body() updateInventoryDtos: UpdateInventoryDto[],
    @Res() res: Response,
  ) {
    try {
      const updatedInventory: InventoryDto[] =
        await this.inventoryService.update(updateInventoryDtos);
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
