import { Test, TestingModule } from '@nestjs/testing';
import { RefreshToken } from 'src/core/auth/refresh-token.entity';
import { RefreshTokenRepositoryPort } from 'src/core/auth/ports/refresh-token.repository.port';
import { RefreshTokenService } from 'src/core/auth/refresh-token.service';

describe('RefreshTokenService', () => {
    let service: RefreshTokenService;
    let repository: jest.Mocked<RefreshTokenRepositoryPort>;

    beforeEach(async () => {
        repository = {
            create: jest.fn().mockImplementation(async (t: RefreshToken) => t),
            findByHash: jest.fn(),
            revoke: jest.fn().mockResolvedValue(true),
            revokeAllForUser: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RefreshTokenService,
                { provide: RefreshTokenRepositoryPort, useValue: repository },
            ],
        }).compile();
        service = module.get(RefreshTokenService);
    });

    describe('issue', () => {
        it('persists only the hash and returns the raw token', async () => {
            const raw = await service.issue(7, 'Pixel 8');
            expect(typeof raw).toBe('string');
            expect(raw.length).toBeGreaterThan(0);
            const stored = repository.create.mock.calls[0][0];
            expect(stored.userId).toBe(7);
            expect(stored.deviceLabel).toBe('Pixel 8');
            expect(stored.tokenHash).not.toEqual(raw);
            expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });

        it('normalizes a blank device label to null', async () => {
            await service.issue(7, '   ');
            expect(repository.create.mock.calls[0][0].deviceLabel).toBeNull();
        });
    });

    describe('rotate', () => {
        it('issues a new token and revokes the presented one when active', async () => {
            const existing = new RefreshToken({
                id: 42,
                userId: 7,
                tokenHash: 'irrelevant',
                expiresAt: new Date(Date.now() + 60_000),
            });
            repository.findByHash.mockResolvedValue(existing);

            const result = await service.rotate('presented-raw');

            expect(result).not.toBeNull();
            expect(result?.userId).toBe(7);
            expect(repository.create).toHaveBeenCalledTimes(1); // the new token
            expect(repository.revoke).toHaveBeenCalledWith(42, expect.any(Date));
        });

        it('returns null without minting a token when it loses the rotation race', async () => {
            repository.findByHash.mockResolvedValue(
                new RefreshToken({
                    id: 42,
                    userId: 7,
                    tokenHash: 'irrelevant',
                    expiresAt: new Date(Date.now() + 60_000),
                })
            );
            // Concurrent rotation already revoked the row: the conditional revoke affects nothing.
            repository.revoke.mockResolvedValueOnce(false);

            const result = await service.rotate('presented-raw');

            expect(result).toBeNull();
            expect(repository.create).not.toHaveBeenCalled();
        });

        it('returns null for an unknown token', async () => {
            repository.findByHash.mockResolvedValue(null);
            expect(await service.rotate('nope')).toBeNull();
            expect(repository.revoke).not.toHaveBeenCalled();
        });

        it('returns null for an expired token', async () => {
            repository.findByHash.mockResolvedValue(
                new RefreshToken({
                    id: 1,
                    userId: 7,
                    tokenHash: 'h',
                    expiresAt: new Date(Date.now() - 1000),
                })
            );
            expect(await service.rotate('expired')).toBeNull();
            expect(repository.create).not.toHaveBeenCalled();
        });

        it('returns null for a revoked token', async () => {
            repository.findByHash.mockResolvedValue(
                new RefreshToken({
                    id: 1,
                    userId: 7,
                    tokenHash: 'h',
                    expiresAt: new Date(Date.now() + 60_000),
                    revokedAt: new Date(),
                })
            );
            expect(await service.rotate('revoked')).toBeNull();
        });

        it('returns null for an empty token without hitting the repository', async () => {
            expect(await service.rotate('')).toBeNull();
            expect(repository.findByHash).not.toHaveBeenCalled();
        });
    });

    describe('revoke', () => {
        it('revokes a known active token', async () => {
            repository.findByHash.mockResolvedValue(
                new RefreshToken({
                    id: 5,
                    userId: 7,
                    tokenHash: 'h',
                    expiresAt: new Date(Date.now() + 60_000),
                })
            );
            await service.revoke('raw');
            expect(repository.revoke).toHaveBeenCalledWith(5, expect.any(Date));
        });

        it('is a no-op for an unknown token', async () => {
            repository.findByHash.mockResolvedValue(null);
            await service.revoke('raw');
            expect(repository.revoke).not.toHaveBeenCalled();
        });
    });

    describe('revokeAllForUser', () => {
        it('delegates to the repository', async () => {
            await service.revokeAllForUser(7);
            expect(repository.revokeAllForUser).toHaveBeenCalledWith(7, expect.any(Date));
        });
    });
});
