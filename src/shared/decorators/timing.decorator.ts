export function Timing(): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const start = Date.now();
            console.log(`[${String(propertyKey)}] Execution started...`);
            const result = await originalMethod.apply(this, args);
            const end = Date.now();
            console.log(`[${String(propertyKey)}] Execution finished. Time taken: ${end - start}ms`);
            return result;
        };
        return descriptor;
    };
}