import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { UploadRateLimitGuard } from 'src/http/hbs/inventory/guards/upload-rate-limit.guard';

function makeContext(userId: number | undefined): ExecutionContext {
    return {
        switchToHttp: () => ({
            getRequest: () => ({ user: userId !== undefined ? { id: userId } : undefined }),
        }),
    } as unknown as ExecutionContext;
}

describe('UploadRateLimitGuard', () => {
    let guard: UploadRateLimitGuard;

    beforeEach(() => {
        guard = new UploadRateLimitGuard();
    });

    afterEach(() => {
        guard.onModuleDestroy();
    });

    it('allows requests under the limit', () => {
        const ctx = makeContext(1);
        for (let i = 0; i < 10; i++) {
            expect(guard.canActivate(ctx)).toBe(true);
        }
    });

    it('blocks the 11th request in a window', () => {
        const ctx = makeContext(2);
        for (let i = 0; i < 10; i++) {
            guard.canActivate(ctx);
        }
        expect(() => guard.canActivate(ctx)).toThrow(HttpException);
        expect(() => guard.canActivate(ctx)).toThrow(
            expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS })
        );
    });

    it('allows different users independently', () => {
        const ctxA = makeContext(10);
        const ctxB = makeContext(11);
        for (let i = 0; i < 10; i++) {
            guard.canActivate(ctxA);
        }
        // User B should still be allowed
        expect(guard.canActivate(ctxB)).toBe(true);
    });

    it('throws Unauthorized when no user', () => {
        const ctx = makeContext(undefined);
        expect(() => guard.canActivate(ctx)).toThrow(
            expect.objectContaining({ status: HttpStatus.UNAUTHORIZED })
        );
    });
});
