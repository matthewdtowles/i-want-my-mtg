export const BaseRepositoryPort = "BaseRepositoryPort";

export interface BaseRepositoryPort {

    /**
     * @returns total number of unique cards
     */
    totalCards(): Promise<number>;

    /**
     * @param setCode
     * @returns total number of cards in set
     */
    totalCardsInSet(setCode: string): Promise<number>;
}