import { Inject, Injectable } from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { getLogger } from "src/logger/global-app-logger";
import { Card } from "./card.entity";
import { CardRepositoryPort } from "./card.repository.port";
import { Format } from "./format.enum";
import { Legality } from "./legality.entity";
import { LegalityStatus } from "./legality.status.enum";

@Injectable()
export class CardService {

    private readonly LOGGER = getLogger(CardService.name);

    constructor(@Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort) { }

    async findWithName(name: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Find cards with name ${name}.`);
        try {
            const cards = await this.repository.findWithName(name, options);
            this.LOGGER.debug(`Found ${cards?.length} with name ${name}.`);
            return cards;
        } catch (error) {
            throw new Error(`Error finding cards with name ${name}: ${error.message}`);
        }
    }

    async findBySet(code: string, query: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Find cards in set ${code}.`);
        try {
            const cards = await this.repository.findBySet(code, query);
            this.LOGGER.debug(`Found ${cards?.length} in set ${code}.`);
            return cards;
        } catch (error) {
            throw new Error(`Error finding cards in set ${code}: ${error.message}`);
        }
    }

    async findBySetCodeAndNumber(code: string, number: string): Promise<Card | null> {
        this.LOGGER.debug(`Find card no. ${number} in set ${code}.`);
        try {
            const card = await this.repository.findBySetCodeAndNumber(code, number, ["set", "legalities", "prices"]);
            this.LOGGER.debug(`Card no. ${number} in set ${code}: ${card ? card.id : "Not found"}.`);
            return card;
        } catch (error) {
            throw new Error(`Error finding card with set code ${code} and number ${number}: ${error.message}`);
        }
    }

    async totalWithName(name: string): Promise<number> {
        this.LOGGER.debug(`Find total number of cards with name ${name}.`);
        try {
            const total = await this.repository.totalWithName(name);
            this.LOGGER.debug(`Total cards with name ${name}: ${total}.`);
            return total;
        } catch (error) {
            throw new Error(`Error counting cards with name ${name}: ${error.message}`);
        }
    }
}
