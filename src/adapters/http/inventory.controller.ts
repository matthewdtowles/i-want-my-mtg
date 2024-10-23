import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject, Patch,
  Render,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { InventoryDto } from "src/core/inventory/dto/inventory.dto";
import { UpdateInventoryDto } from "src/core/inventory/dto/update-inventory.dto";
import { InventoryServicePort } from "src/core/inventory/ports/inventory.service.port";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";

@Controller("inventory")
export class InventoryController {

  constructor(
    @Inject(InventoryServicePort)
    private readonly inventoryService: InventoryServicePort,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @Render("inventory")
  async findByUser(@Req() req: AuthenticatedRequest): Promise<InventoryDto[]> {
    if (!req.user) {
      throw new Error("User not found in request");
    }
    if (!req.user.id) {
      throw new Error("ID not found in request user");
    }
    const inventory: InventoryDto[] = await this.inventoryService.findByUser(req.user.id);
    return inventory;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @Body() updateInventoryDtos: UpdateInventoryDto[],
    @Res() res: Response,
  ) {
    try {
      const updatedInventory: InventoryDto[] =
        await this.inventoryService.save(updateInventoryDtos);
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
