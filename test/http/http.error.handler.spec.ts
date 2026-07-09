import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    InternalServerErrorException,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import {
    DomainNotAuthorizedError,
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';
import { HttpErrorHandler } from 'src/http/http.error.handler';

describe('HttpErrorHandler.toHttpException', () => {
    const call = (error: Error) => () => HttpErrorHandler.toHttpException(error, 'test');

    // Regression for B1: an HttpException thrown inside an orchestrator try block
    // (e.g. validateAuthenticatedRequest's UnauthorizedException) must be
    // rethrown unchanged, not re-mapped by message. Previously the 'not found'
    // in "User not found in request" turned a 401 into a 404, breaking the login
    // redirect.
    it('rethrows an existing HttpException unchanged', () => {
        const unauthorized = new UnauthorizedException('User not found in request');
        try {
            HttpErrorHandler.toHttpException(unauthorized, 'test');
            fail('expected toHttpException to throw');
        } catch (e) {
            // Assert the exact instance/class, not just the message: a message
            // match would still pass if the 401 were remapped to a 404
            // NotFoundException('User not found in request') - the B1 regression.
            expect(e).toBe(unauthorized);
            expect(e).toBeInstanceOf(UnauthorizedException);
        }
    });

    it('maps DomainNotFoundError to 404', () => {
        expect(call(new DomainNotFoundError('Set X not found'))).toThrow(NotFoundException);
    });

    it('maps DomainNotAuthorizedError to 403', () => {
        expect(call(new DomainNotAuthorizedError('Not your deck'))).toThrow(ForbiddenException);
    });

    it('maps DomainValidationError to 400', () => {
        expect(call(new DomainValidationError('Name is required'))).toThrow(BadRequestException);
    });

    it('preserves the domain error message on the mapped exception', () => {
        try {
            HttpErrorHandler.toHttpException(new DomainValidationError('Name is required'), 'test');
        } catch (e) {
            expect((e as HttpException).message).toBe('Name is required');
        }
    });

    it('maps an unknown error to a 500 without leaking its message', () => {
        try {
            HttpErrorHandler.toHttpException(new Error('DB connection string is postgres://secret'), 'test');
            fail('expected throw');
        } catch (e) {
            expect(e).toBeInstanceOf(InternalServerErrorException);
            expect((e as HttpException).message).toBe('An unexpected error occurred');
        }
    });

    // Callers pass the raw `catch (error)` value (typed `any` here), so a
    // non-Error can reach us at runtime. It must be normalized for logging and
    // mapped to a 500, never crash on `.message`/`.stack` access.
    it('normalizes a non-Error thrown value to a 500', () => {
        for (const thrown of ['just a string', { code: 42 }, null, undefined]) {
            expect(() =>
                HttpErrorHandler.toHttpException(thrown as unknown as Error, 'test')
            ).toThrow(InternalServerErrorException);
        }
    });

    // W1 part 3: the transitional keyword fallback is gone. A plain Error whose
    // message happens to contain "not found" (or any other former keyword) is now
    // an honest 500, not a 404 — callers must throw a Domain*Error to signal a
    // non-500 status. Guards against the fallback silently coming back.
    it('does not map a plain Error with a keyword-significant message', () => {
        try {
            HttpErrorHandler.toHttpException(new Error('Set with code BAD not found'), 'test');
            fail('expected throw');
        } catch (e) {
            expect(e).toBeInstanceOf(InternalServerErrorException);
            expect(e).not.toBeInstanceOf(NotFoundException);
            expect((e as HttpException).message).toBe('An unexpected error occurred');
        }
    });
});
