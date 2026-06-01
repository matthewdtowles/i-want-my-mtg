import { HttpException, HttpStatus } from '@nestjs/common';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';

/**
 * Turn a thrown domain/HTTP error into the clean text returned in an MCP
 * `isError` result. Mirrors the messaging of `iwantmymtg-mcp/src/error-formatter.ts`
 * so the in-app endpoint and the stdio server give clients the same guidance.
 */
export function toMcpErrorText(err: unknown): string {
    if (err instanceof HttpException) {
        const status = err.getStatus();
        const message = extractHttpMessage(err.getResponse());
        if (status === HttpStatus.UNAUTHORIZED) {
            return 'Not authenticated. Provide your iwm_live_... API key as a Bearer token. Create one at https://iwantmymtg.net/user/api-keys.';
        }
        if (status === HttpStatus.PAYMENT_REQUIRED || status === HttpStatus.FORBIDDEN) {
            const detail = message ?? 'Premium subscription required.';
            return `${detail} This feature requires an active IWMM Premium subscription. Upgrade at https://iwantmymtg.net/pricing.`;
        }
        if (status === HttpStatus.TOO_MANY_REQUESTS) {
            return `Rate limit exceeded. ${message ?? ''}`.trim();
        }
        return message ?? `Request failed with status ${status}.`;
    }
    if (
        err instanceof DomainNotFoundError ||
        err instanceof DomainValidationError ||
        err instanceof DomainNotAuthorizedError
    ) {
        return err.message;
    }
    return err instanceof Error ? err.message : String(err);
}

function extractHttpMessage(response: string | object): string | undefined {
    if (typeof response === 'string') return response;
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('; ');
    return undefined;
}
