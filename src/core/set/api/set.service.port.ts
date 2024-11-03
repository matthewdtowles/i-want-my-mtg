import { CreateSetDto, SetDto, UpdateSetDto } from "./set.dto";

export const SetServicePort = "SetServicePort";

/**
 * Set operations service
 * Implemented by Core and used by Adapters
 */
export interface SetServicePort {
    /**
     * Save given sets
     *
     * @param set
     * @returns saved set
     */
    save(set: CreateSetDto[] | UpdateSetDto[]): Promise<SetDto[]>;

    /**
     * Return metadata of every set
     * Does not include cards
     *
     * @returns all sets without cards
     */
    findAll(): Promise<SetDto[]>;

    /**
     * Return metadata of every set in format
     * Does not include cards
     *
     * @param format
     * @returns all sets without cards that are legal in format
     */
    findAllInFormat(format: string): Promise<SetDto[]>;

    /**
     * Return set including cards with code
     *
     * @param setCode
     * @returns set with code
     */
    findByCode(setCode: string): Promise<SetDto>;
}
