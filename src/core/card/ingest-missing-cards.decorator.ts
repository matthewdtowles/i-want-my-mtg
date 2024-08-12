import { Card } from "./card";

// runtime decorator to ingest all cards in set if card or cards do not exist
export function IngestMissingCards() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            let result = await originalMethod.apply(this, args);
            if (null === result) {
                const setCards: Card[] = await this.ingestionService.fetchSetCards(args[0]);
                setCards.forEach((card) => {
                    this.repository.saveCard(card);
                });
            }
            return await originalMethod.apply(this, args);
        };
        return descriptor;
    };
}