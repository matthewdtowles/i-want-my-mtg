import { CardDto } from "../dto/card.dto";
import { CreateCardDto } from "../dto/create-card.dto";
import { UpdateCardDto } from "../dto/update-card.dto";

export const CardServicePort = "CardServicePort";

/**
 * Individual Card service
 * Implemented by Core
 * Used by Adapters
 */
export interface CardServicePort {
  /**
   * Save card(s) as given
   *
   * @param cards
   * @returns saved card
   */
  save(cards: CreateCardDto[] | UpdateCardDto[]): Promise<CardDto[]>;

  /**
   * @param setCode
   * @returns all cards in set
   */
  findAllInSet(setCode: string): Promise<CardDto[]>;

  /**
   * @param name
   * @returns all cards with name
   */
  findAllWithName(name: string): Promise<CardDto[]>;

  /**
   * @param id
   * @returns card with id | null if not found
   */
  findById(id: number): Promise<CardDto | null>;

  /**
   * @param setCode
   * @param number
   * @returns card with number in set
   */
  findBySetCodeAndNumber(
    setCode: string,
    number: number,
  ): Promise<CardDto | null>;

  /**
   * @param uuid
   * @returns card with unique uuid | null if not found
   */
  findByUuid(uuid: string): Promise<CardDto | null>;
}
