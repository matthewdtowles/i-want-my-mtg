import { ArgumentsHost, UnauthorizedException } from '@nestjs/common';
import { DomainNotFoundError, DomainValidationError } from 'src/core/errors/domain.errors';
import { HttpExceptionFilter } from 'src/http/http.exception.filter';

type Rendered = { status: number; template?: string; json?: any; view?: any };

function hostFor(url: string, headers: Record<string, string> = {}): {
    host: ArgumentsHost;
    result: Rendered;
} {
    const result: Rendered = { status: 0 };
    const response = {
        status(code: number) {
            result.status = code;
            return this;
        },
        json(body: any) {
            result.json = body;
            return this;
        },
        render(template: string, view: any) {
            result.template = template;
            result.view = view;
            return this;
        },
    };
    const request = { url, headers, body: {} };
    const host = {
        switchToHttp: () => ({
            getResponse: () => response,
            getRequest: () => request,
        }),
    } as unknown as ArgumentsHost;
    return { host, result };
}

describe('HttpExceptionFilter', () => {
    const filter = new HttpExceptionFilter();

    describe('API requests (JSON)', () => {
        it('maps a DomainNotFoundError to 404 with its message', () => {
            const { host, result } = hostFor('/api/v1/cards/x');
            filter.catch(new DomainNotFoundError('Card x not found'), host);
            expect(result.status).toBe(404);
            expect(result.json.error).toBe('Card x not found');
        });

        it('maps a DomainValidationError to 400', () => {
            const { host, result } = hostFor('/api/v1/decks');
            filter.catch(new DomainValidationError('Name is required'), host);
            expect(result.status).toBe(400);
            expect(result.json.error).toBe('Name is required');
        });

        it('returns a generic 500 body for an unexpected error (no leak)', () => {
            const { host, result } = hostFor('/api/v1/cards');
            filter.catch(new Error('connect ECONNREFUSED 10.0.0.5:5432'), host);
            expect(result.status).toBe(500);
            expect(result.json.error).toBe('Internal Server Error');
        });
    });

    describe('page requests (HBS)', () => {
        it('renders errors/404 for a DomainNotFoundError', () => {
            const { host, result } = hostFor('/sets/xyz');
            filter.catch(new DomainNotFoundError('Set xyz not found'), host);
            expect(result.status).toBe(404);
            expect(result.template).toBe('errors/404');
        });

        it('renders errors/401 with returnUrl for an UnauthorizedException', () => {
            const { host, result } = hostFor('/inventory');
            filter.catch(new UnauthorizedException('not logged in'), host);
            expect(result.status).toBe(401);
            expect(result.template).toBe('errors/401');
            expect(result.view.returnUrl).toBe('/inventory');
        });

        it('renders errors/500 with a generic toast for an unexpected error (no leak)', () => {
            const { host, result } = hostFor('/sets');
            filter.catch(new Error('secret db dsn postgres://u:p@h/db'), host);
            expect(result.status).toBe(500);
            expect(result.template).toBe('errors/500');
            expect(result.view.toast.message).toBe('Internal Server Error');
        });
    });
});
