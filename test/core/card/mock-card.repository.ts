import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";

export class MockCardRepository implements CardRepositoryPort {
    save = jest.fn((cards: Card[]): Promise<Card[]> => {
        return Promise.resolve(cards);
    });

    findAllInSet = jest.fn((setCode: string): Promise<Card[]> => {
        return Promise.resolve([]);
    });

    findById = jest.fn((id: number): Promise<Card> => {
        return Promise.resolve(null);
    });

    findBySetCodeAndNumber = jest.fn((setCode: string, number: number): Promise<Card> => {
        return Promise.resolve(null);
    });

    findByUuid = jest.fn((uuid: string): Promise<Card> => {
        return Promise.resolve(null);
    });

    findAllWithName = jest.fn((name: string): Promise<Card[]> => {
        return Promise.resolve([]);
    });

    delete = jest.fn((card: Card): Promise<void> => {
        return Promise.resolve();
    });

    findLegalities = jest.fn((cardId: number): Promise<Legality[]> => {
        return Promise.resolve([]);
    });

    saveLegalities = jest.fn((legalities: Legality[]): Promise<Legality[]> =>{
        return Promise.resolve(legalities);
    });

    deleteLegality = jest.fn((cardId: number, format: string): Promise<void> => {
        return Promise.resolve();
    });
}
