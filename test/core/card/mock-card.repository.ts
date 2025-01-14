import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";

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
}
