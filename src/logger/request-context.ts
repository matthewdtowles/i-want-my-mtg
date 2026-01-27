import { AsyncLocalStorage } from 'async_hooks';

type ContextType = { correlationId?: string; userId?: string };

export const RequestContext = new AsyncLocalStorage<ContextType>();

export function getRequestContext(): ContextType | undefined {
    return RequestContext.getStore();
}
