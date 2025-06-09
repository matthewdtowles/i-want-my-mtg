import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";

export class MockCardRepository implements CardRepositoryPort {

    private cards: Card[] = [];

    async save(_cards: Card[]): Promise<Card[]> {
        _cards.forEach(card => {
            const existingCardIndex: number = this.cards.findIndex(c => c.order === card.order);
            if (existingCardIndex >= 0) {
                this.cards[existingCardIndex] = card;
            } else {
                card.order = this.cards.length + 1;
                card?.legalities?.forEach(legality => {
                    legality.cardId = card.order;
                });
                this.cards.push(card);
            }
        });
        return _cards;
    }

    async findAllInSet(setCode: string): Promise<Card[]> {
        return this.cards.filter(card => card.setCode === setCode);
    }

    async findByUuid(cardId: number): Promise<Card> {
        const card = this.cards.find(c => c.order === cardId);
        if (!card) {
            throw new Error(`Card with id ${cardId} not found`);
        }
        return card;
    }

    async findBySetCodeAndNumber(setCode: string, number: string): Promise<Card> {
        if (!setCode) {
            throw new Error("Invalid input setCode");
        }
        if (!number) {
            throw new Error("Invalid input number");
        }
        return this.cards.find(card => card.setCode === setCode && card.number === number);
    }

    async findByUuid(uuid: string): Promise<Card> {
        const card = this.cards.find(card => card.id === uuid);
        if (!card) {
            throw new Error(`Card with uuid ${uuid} not found`);
        }
        return card;
    }

    async findByUuids(uuids: string[]): Promise<Card[]> {
        if (!uuids || uuids.length === 0) {
            throw new Error("No UUIDs provided");
        }
        return this.cards.filter(card => uuids.includes(card.id));
    }

    async findAllWithName(name: string): Promise<Card[]> {
        return this.cards.filter(card => card.name === name);
    }

    async delete(card: Card): Promise<void> {
        this.cards = this.cards.filter(c => c.order !== card.order);
    }

    async deleteLegality(cardId: number, format: string): Promise<void> {
        const card = this.cards.find(c => c.order === cardId);
        if (card) {
            card.legalities = card.legalities.filter(l => l.format !== format);
        }
    }

    reset(): void {
        this.cards = [];
    }

    populate(cards: Card[]): void {
        this.cards = cards;
    }
}
