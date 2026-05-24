import { Inject, Injectable } from '@nestjs/common';
import { Card } from 'src/core/card/card.entity';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';
import { parseBool } from './import.types';

export interface CardIdentifiers {
    id?: string;
    name?: string;
    set_code?: string;
    set_name?: string;
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
        private readonly cardRepository: CardRepositoryPort,
        @Inject(SetRepositoryPort)
        private readonly setRepository: SetRepositoryPort
    ) {}

    async resolveCard(identifiers: CardIdentifiers): Promise<CardResolveResult> {
        try {
            if (identifiers.id) {
                const card = await this.cardRepository.findById(identifiers.id, []);
                return card
                    ? { card, error: null }
                    : { card: null, error: `Card not found for id: ${identifiers.id}` };
            }

            // Set codes are stored lowercase. Normalize incoming values so a
            // native CSV with an uppercase set_code (common in hand-edited
            // spreadsheets) still resolves.
            let setCode = identifiers.set_code?.trim().toLowerCase();
            if (!setCode && identifiers.set_name) {
                const set = await this.setRepository.findByExactName(identifiers.set_name);
                if (!set) {
                    return {
                        card: null,
                        error: `Set not found: "${identifiers.set_name}"`,
                    };
                }
                setCode = set.code;
            }

            if (setCode && identifiers.number) {
                const card = await this.cardRepository.findBySetCodeAndNumber(
                    setCode,
                    identifiers.number,
                    []
                );
                return card
                    ? { card, error: null }
                    : {
                          card: null,
                          error: `Card not found for set ${setCode} #${identifiers.number}`,
                      };
            }

            if (identifiers.name && setCode) {
                const matches = await this.cardRepository.findByNameAndSetCode(
                    identifiers.name,
                    setCode
                );
                if (matches.length > 1) {
                    return {
                        card: null,
                        error: `Ambiguous: "${identifiers.name}" in ${setCode} matches ${matches.length} cards; add collector number`,
                    };
                }
                if (matches.length === 0) {
                    return {
                        card: null,
                        error: `Card not found: "${identifiers.name}" in ${setCode}`,
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
            const explicit = parseBool(foilValue);
            if (!explicit && !card.hasNonFoil) {
                return null;
            }
            return explicit;
        }
        if (card.hasNonFoil) return false;
        if (card.hasFoil) return true;
        return false;
    }
}
