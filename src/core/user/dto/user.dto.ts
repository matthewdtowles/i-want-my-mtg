import { Type } from "class-transformer";
import { UserRole } from "src/adapters/http/auth/user.role";
import { InventoryDto } from "src/core/inventory/dto/inventory.dto";

export class UserDto {
  readonly id: number;
  readonly email: string;
  readonly name: string;

  @Type(() => InventoryDto)
  readonly inventory: InventoryDto[];
  readonly roles: UserRole[];
}
