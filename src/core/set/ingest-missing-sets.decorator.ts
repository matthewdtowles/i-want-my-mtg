import { Set } from "./set";

// runtime decorator to ingest a set if set does not exist
// note: `this` refers to the class instance using this decorator
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