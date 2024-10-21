import { CardDto } from "src/core/card/dto/card.dto";
import { UserDto } from "src/core/user/dto/user.dto";

/**
 * Represents single item in a user's inventory for read operations.
 */
export class InventoryDto {
  readonly card: CardDto;
  readonly quantity: number;
  readonly user: UserDto;
}
