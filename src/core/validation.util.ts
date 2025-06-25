export function validateInit<T>(init: Partial<T>, requiredFields: (keyof T)[]): void {
    for (const field of requiredFields) {
        if (undefined === init[field] || null === init[field]) {
            throw new Error(`Invalid initialization: ${String(field)} is required.`);
        }
    }
}