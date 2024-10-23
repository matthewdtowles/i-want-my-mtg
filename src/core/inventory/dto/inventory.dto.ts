import { Type } from "class-transformer";
import { CardDto } from "src/core/card/dto/card.dto";
import { UserDto } from "src/core/user/dto/user.dto";

/**
 * Represents single item in a user's inventory for read operations.
 */
export class InventoryDto {

  @Type(() => CardDto)
  readonly card: CardDto;

  readonly quantity: number;

  @Type(() => UserDto)
  readonly user: UserDto;
}
