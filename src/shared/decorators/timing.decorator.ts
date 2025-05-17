export function Timing(): MethodDecorator {
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const start = Date.now();
            console.log(`[${String(propertyKey)}] Execution started...`);
            const result = await originalMethod.apply(this, args);
            const duration = Date.now() - start;
            if (duration > 500) {
                console.warn(`[${String(propertyKey)}] Execution took ${duration}ms`);
            } else {
                console.debug(`[${String(propertyKey)}] Execution took ${duration}ms`);
            }
            return result;
        };
        return descriptor;
    };
}