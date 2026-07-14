import { Test, TestingModule } from '@nestjs/testing';
import { createHash } from 'crypto';
import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyService } from 'src/core/api-tier/api-key.service';
import { ApiKeyRepositoryPort } from 'src/core/api-tier/ports/api-key.repository.port';
import {
    DomainNotFoundError,
    DomainValidationError,
} from 'src/core/errors/domain.errors';

describe('ApiKeyService', () => {
    let service: ApiKeyService;
    let repo: jest.Mocked<ApiKeyRepositoryPort>;

    beforeEach(async () => {
        repo = {
            create: jest.fn(),
            findByHash: jest.fn(),
            findActiveByUserId: jest.fn(),
            findAllByUserId: jest.fn(),
            revoke: jest.fn(),
            touchLastUsed: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [ApiKeyService, { provide: ApiKeyRepositoryPort, useValue: repo }],
        }).compile();

        service = module.get(ApiKeyService);
    });

    describe('create', () => {
        beforeEach(() => {
            repo.findActiveByUserId.mockResolvedValue(null);
            repo.create.mockImplementation(async (k) => new ApiKey({ ...k, id: 1 }));
        });

        it('returns raw key prefixed with iwm_live_ and a persisted ApiKey', async () => {
            const result = await service.create(7, 'default');
            expect(result.rawKey).toMatch(/^iwm_live_[A-Za-z0-9_-]+$/);
            expect(result.apiKey.userId).toBe(7);
            expect(result.apiKey.name).toBe('default');
            expect(result.apiKey.id).toBe(1);
        });

        it('stores sha256 hash, not the raw key', async () => {
            const result = await service.create(7, 'default');
            const expectedHash = createHash('sha256').update(result.rawKey).digest('hex');
            expect(result.apiKey.keyHash).toBe(expectedHash);
            expect(result.apiKey.keyHash).not.toContain(result.rawKey);
        });

        it('uses iwm_live_ + 4 chars as keyPrefix', async () => {
            const result = await service.create(7, 'default');
            expect(result.apiKey.keyPrefix).toBe(result.rawKey.slice(0, 13));
            expect(result.apiKey.keyPrefix.startsWith('iwm_live_')).toBe(true);
        });

        it('rejects empty/whitespace name', async () => {
            await expect(service.create(7, '')).rejects.toBeInstanceOf(DomainValidationError);
            await expect(service.create(7, '   ')).rejects.toBeInstanceOf(DomainValidationError);
        });

        it('rejects when user already has an active key', async () => {
            repo.findActiveByUserId.mockResolvedValue(
                new ApiKey({
                    id: 99,
                    userId: 7,
                    keyHash: 'h',
                    keyPrefix: 'iwm_live_aaaa',
                    name: 'old',
                })
            );
            await expect(service.create(7, 'new')).rejects.toBeInstanceOf(DomainValidationError);
            expect(repo.create).not.toHaveBeenCalled();
        });

        it('generates unique keys across calls', async () => {
            const a = await service.create(1, 'a');
            const b = await service.create(2, 'b');
            expect(a.rawKey).not.toBe(b.rawKey);
        });
    });

    describe('revoke', () => {
        const existing = new ApiKey({
            id: 5,
            userId: 7,
            keyHash: 'h',
            keyPrefix: 'iwm_live_xxxx',
            name: 'k',
        });

        it('revokes a key the user owns', async () => {
            repo.findAllByUserId.mockResolvedValue([existing]);
            await service.revoke(7, 5);
            expect(repo.revoke).toHaveBeenCalledWith(5, expect.any(Date));
        });

        it('throws DomainNotFoundError when key id is unknown', async () => {
            repo.findAllByUserId.mockResolvedValue([]);
            await expect(service.revoke(7, 99)).rejects.toBeInstanceOf(DomainNotFoundError);
        });

        it('is a no-op when already revoked', async () => {
            repo.findAllByUserId.mockResolvedValue([
                new ApiKey({ ...existing, revokedAt: new Date() }),
            ]);
            await service.revoke(7, 5);
            expect(repo.revoke).not.toHaveBeenCalled();
        });
    });

    describe('resolveByRawKey', () => {
        it('returns null for empty/missing prefix', async () => {
            expect(await service.resolveByRawKey('')).toBeNull();
            expect(await service.resolveByRawKey('not-a-key')).toBeNull();
            expect(repo.findByHash).not.toHaveBeenCalled();
        });

        it('looks up by sha256(rawKey)', async () => {
            const raw = 'iwm_live_abc123';
            const hash = createHash('sha256').update(raw).digest('hex');
            const stored = new ApiKey({
                id: 1,
                userId: 7,
                keyHash: hash,
                keyPrefix: 'iwm_live_abc1',
                name: 'k',
            });
            repo.findByHash.mockResolvedValue(stored);
            const found = await service.resolveByRawKey(raw);
            expect(repo.findByHash).toHaveBeenCalledWith(hash);
            expect(found?.id).toBe(1);
        });

        it('returns null for revoked keys', async () => {
            repo.findByHash.mockResolvedValue(
                new ApiKey({
                    id: 1,
                    userId: 7,
                    keyHash: 'h',
                    keyPrefix: 'iwm_live_aaaa',
                    name: 'k',
                    revokedAt: new Date(),
                })
            );
            expect(await service.resolveByRawKey('iwm_live_anything')).toBeNull();
        });
    });
});
