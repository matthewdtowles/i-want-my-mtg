import { Inject, Injectable } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';

export interface CardIdentifiers {
    id?: string;
    name?: string;
    set_code?: string;
    number?: string;
}

export interface CardResolveResult {
    card: Card | null;
    error: string | null;
}

@Injectable()
export class CardImportResolver {
    constructor(
        @Inject(CardRepositoryPort)
        private readonly cardRepository: CardRepositoryPort
    ) {}

    async resolveCard(identifiers: CardIdentifiers): Promise<CardResolveResult> {
        try {
            if (identifiers.id) {
                const card = await this.cardRepository.findById(identifiers.id, []);
                return card
                    ? { card, error: null }
                    : { card: null, error: `Card not found for id: ${identifiers.id}` };
            }

            if (identifiers.set_code && identifiers.number) {
                const card = await this.cardRepository.findBySetCodeAndNumber(
                    identifiers.set_code,
                    identifiers.number,
                    []
                );
                return card
                    ? { card, error: null }
                    : {
                          card: null,
                          error: `Card not found for set ${identifiers.set_code} #${identifiers.number}`,
                      };
            }

            if (identifiers.name && identifiers.set_code) {
                const matches = await this.cardRepository.findByNameAndSetCode(
                    identifiers.name,
                    identifiers.set_code
                );
                if (matches.length > 1) {
                    return {
                        card: null,
                        error: `Ambiguous: "${identifiers.name}" in ${identifiers.set_code} matches ${matches.length} cards; add collector number`,
                    };
                }
                if (matches.length === 0) {
                    return {
                        card: null,
                        error: `Card not found: "${identifiers.name}" in ${identifiers.set_code}`,
                    };
                }
                return { card: matches[0], error: null };
            }

            return {
                card: null,
                error: `Insufficient identifier: provide id, set_code+number, or name+set_code`,
            };
        } catch (e) {
            return { card: null, error: `Lookup error: ${e.message}` };
        }
    }

    resolveFoil(foilValue: string | undefined, card: Card): boolean | null {
        if (foilValue !== undefined && foilValue !== '') {
            const explicit = this.parseBool(foilValue, false);
            if (!explicit && !card.hasNonFoil) {
                return null;
            }
            return explicit;
        }
        if (card.hasNonFoil) return false;
        if (card.hasFoil) return true;
        return false;
    }

    private parseBool(value: string | undefined, defaultValue: boolean): boolean {
        if (value === undefined || value === '') return defaultValue;
        const lower = value.toLowerCase().trim();
        return lower === 'true' || lower === '1' || lower === 'yes';
    }
}
