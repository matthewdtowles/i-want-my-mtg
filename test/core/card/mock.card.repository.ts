import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";

export class MockCardRepository implements CardRepositoryPort {

    private cards: Card[] = [];

    async save(_cards: Card[]): Promise<Card[]> {
        _cards.forEach(card => {
            const existingCardIndex: number = this.cards.findIndex(c => c.id === card.id);
            if (existingCardIndex !== -1) {
                this.cards[existingCardIndex] = card;
            } else {
                card.id = this.cards.length + 1;
                this.cards.push(card);
            }
        });
        return _cards;
    }

    async findAllInSet(setCode: string): Promise<Card[]> {
        return this.cards.filter(card => card.setCode === setCode);
    }

    async findById(cardId: number): Promise<Card> {
        return this.cards.find(c => c.id === cardId);
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<Card> {
        return this.cards.find(card => card.setCode === setCode && card.number === number.toString());
    }

    async findByUuid(uuid: string): Promise<Card> {
        return this.cards.find(card => card.uuid === uuid);
    }

    async findAllWithName(name: string): Promise<Card[]> {
        return this.cards.filter(card => card.name === name);
    }

    async delete(card: Card): Promise<void> {
        this.cards = this.cards.filter(c => c.id !== card.id);
    }

    async findLegalities(cardId: number): Promise<Legality[]> {
        const card = this.cards.find(c => c.id === cardId);
        return card?.legalities || [];
    }

    async saveLegalities(legalities: Legality[]): Promise<Legality[]> {
        legalities.forEach(legality => {
            const card = this.cards.find(c => c.id === legality.cardId);
            if (card) {
                const existingLegalityIndex = card.legalities.findIndex(l => l.format === legality.format);
                if (existingLegalityIndex !== -1) {
                    card.legalities[existingLegalityIndex] = legality;
                } else {
                    card.legalities.push(legality);
                }
            }
        });
        return legalities;
    }

    async deleteLegality(cardId: number, format: string): Promise<void> {
        const card = this.cards.find(c => c.id === cardId);
        if (card) {
            card.legalities = card.legalities.filter(l => l.format !== format);
        }
    }

    reset(): void {
        this.cards = [];
    }
}
