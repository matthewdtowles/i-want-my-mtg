import { Logger } from "@nestjs/common";

export function Timing(): MethodDecorator {
    const logger = new Logger("TimingDecorator");
    return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args: any[]) {
            const className = target.constructor.name;
            const methodName = String(propertyKey);
            const start = Date.now();
            // console.log(`[${String(propertyKey)}] Execution started...`);
            const result = await originalMethod.apply(this, args);
            const duration = Date.now() - start;
            logger.log(`[${className}.${methodName})}] Execution took ${duration}ms`);
            return result;
        };
        return descriptor;
    };
}