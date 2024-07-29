import { Set } from "../set.entity";

export interface SetServicePort {
    findAll(): Promise<Set[]>;
    findByCode(setCode: string): Promise<Set>;
}