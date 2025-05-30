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
     * Return set including cards with code
     *
     * @param setCode
     * @returns set with code | null if not found
     */
    findByCode(setCode: string): Promise<SetDto | null>;
}
