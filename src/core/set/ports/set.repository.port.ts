import { Set } from "../entities/set.entity";

export interface SetRepositoryPort {
    findSetById(id: string): Promise<Set | null>;
    saveSet(set: Set): Promise<Set>;
}