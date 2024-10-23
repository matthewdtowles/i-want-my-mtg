import { Type } from "class-transformer";
import { IsEnum } from "class-validator";
import { UserRole } from "src/adapters/http/auth/user.role";
import { InventoryDto } from "src/core/inventory/dto/inventory.dto";

export class UserDto {
  readonly id: number;
  readonly email: string;
  readonly name: string;

  @IsEnum(UserRole)
  readonly role: string;
}
