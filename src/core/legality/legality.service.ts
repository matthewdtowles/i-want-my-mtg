import { Injectable } from "@nestjs/common";
import { LegalityServicePort } from "src/core/legality/api/legality.service.port";
import { Legality } from "src/core/legality/legality.entity";

@Injectable()
export class LegalityService implements LegalityServicePort {

    constructor() { }

    save(legalities: Legality[]): Promise<Legality[]> {
        throw new Error("Method not implemented.");
    }

    findAllByCard(cardId: number): Promise<Legality[]> {
        throw new Error("Method not implemented.");
    }

    findAllByCardAndFormat(cardId: number, format: string): Promise<Legality[]> {
        throw new Error("Method not implemented.");
    }
}