import { Set } from "../set.entity";

export const SetRepositoryPort = "SetRepositoryPort";

/**
 * Persistence layer for Set entity
 */
export interface SetRepositoryPort {
  /**
   * Create set entities, update if they exist
   *
   * @param set
   * @returns saved set(s)
   */
  save(set: Set[]): Promise<Set[]>;

  /**
   * @returns all sets - cards not included
   */
  findAllSetsMeta(): Promise<Set[]>;

  /**
   * @param code unique three-letter set code (PK)
   * @returns set entity with code, null if not found
   */
  findByCode(code: string): Promise<Set | null>;

  /**
   * @param name unique set name
   * @returns set entity with name, null if not found
   */
  findByName(name: string): Promise<Set | null>;

  /**
   * Remove set entity
   *
   * @param set
   */
  delete(set: Set): Promise<void>;
}
