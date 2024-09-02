import { Card } from '../card/card.entity';
import { Set } from '../set/set.entity';

// runtime decorator to ingest missing card and set data
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

export function IngestMissingSet() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            let result = await originalMethod.apply(this, args);
            if (null === result) {
                const set: Set[] = await this.ingestionService.fetchSetByCode(args[0]);
            }
        }
    }
}

export function IngestMissingSets() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            let result = await originalMethod.apply(this, args);
            if (null === result || 0 === result.length) {
                const setSets: Set[] = await this.ingestionService.fetchAllSets();
                setSets.forEach((set) => {
                    this.repository.saveSet(set);
                });
            }
            return await originalMethod.apply(this, args);
        };
        return descriptor;
    };
}