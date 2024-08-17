import { Card } from "./card";

// runtime decorator to ingest all cards in set if card or cards do not exist
// note: `this` refers to the class instance using this decorator
export function IngestMissingCards() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            let result = await originalMethod.apply(this, args) ?? [];
            if (0 === result.length) {
                const setCards: Card[] = await this.ingestionService.fetchSetCards(args[0]);
                await this.repository.save(setCards);
            }
            return await originalMethod.apply(this, args);
        };
        return descriptor;
    };
}