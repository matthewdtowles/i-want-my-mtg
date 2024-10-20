import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Patch,
  Render,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { InventoryServicePort } from "src/core/inventory/ports/inventory.service.port";
import { AuthenticatedRequest } from "./auth/authenticated.request";
import { InventoryDto } from "src/core/inventory/dto/inventory.dto";
import { JwtAuthGuard } from "./auth/jwt.auth.guard";
import { UpdateInventoryDto } from "src/core/inventory/dto/update-inventory.dto";
import { Response } from "express";
import { UserDto } from "src/core/user/dto/user.dto";

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
    // TODO: add user and card to each inventory item -> create new model/dto for this
    return await this.inventoryService.findByUser(req.user.id);
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
  // TODO: if updatedInventory[i].quantity < 1: await this.inventoryService.remove(updateInventoryDtos);
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
