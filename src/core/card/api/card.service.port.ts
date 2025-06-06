import { CardImgType } from "src/core/card/api/card.img.type.enum";
import { CreateCardDto, UpdateCardDto } from "src/core/card/api/create-card.dto";
import { CardDto } from "../api/card.dto";

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
     * @param name
     * @returns all cards with name
     */
    findAllWithName(name: string): Promise<CardDto[]>;

    /**
     * @param id
     * @param imgType
     * @returns card with id
     */
    findById(id: number, imgType?: CardImgType): Promise<CardDto>;

    /**
     * @param setCode
     * @param number
     * @param imgType
     * @returns card with number in set
     */
    findBySetCodeAndNumber(setCode: string, number: string, imgType?: CardImgType): Promise<CardDto>;
}
