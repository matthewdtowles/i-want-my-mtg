import { Transform, Type } from "class-transformer";
import { IsEnum } from "class-validator";
import { UserRole } from "src/adapters/http/auth/user.role";
import { InventoryDto } from "src/core/inventory/dto/inventory.dto";

export class UserDto {
  readonly id: number;
  readonly email: string;
  readonly name: string;

  @Type(() => InventoryDto)
  readonly inventory: InventoryDto[];

  @Transform(({ value }) => value.map((role: UserRole) => role.toString()))
  @IsEnum(UserRole, { each: true })
  readonly roles: string[];
}
