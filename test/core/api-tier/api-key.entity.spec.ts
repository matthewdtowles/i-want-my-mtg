import { ApiKey } from 'src/core/api-tier/api-key.entity';

describe('ApiKey entity', () => {
    const valid = { userId: 1, keyHash: 'abc', keyPrefix: 'iwm_live_a1b2', name: 'default' };

    it('requires userId, keyHash, keyPrefix, name', () => {
        expect(() => new ApiKey({ keyHash: 'abc', keyPrefix: 'p', name: 'n' })).toThrow(/userId/);
        expect(() => new ApiKey({ userId: 1, keyPrefix: 'p', name: 'n' })).toThrow(/keyHash/);
        expect(() => new ApiKey({ userId: 1, keyHash: 'abc', name: 'n' })).toThrow(/keyPrefix/);
        expect(() => new ApiKey({ userId: 1, keyHash: 'abc', keyPrefix: 'p' })).toThrow(/name/);
    });

    it('defaults nullable fields and createdAt', () => {
        const k = new ApiKey(valid);
        expect(k.id).toBeNull();
        expect(k.lastUsedAt).toBeNull();
        expect(k.revokedAt).toBeNull();
        expect(k.createdAt).toBeInstanceOf(Date);
    });

    it('isRevoked reflects revokedAt', () => {
        expect(new ApiKey(valid).isRevoked()).toBe(false);
        expect(new ApiKey({ ...valid, revokedAt: new Date() }).isRevoked()).toBe(true);
    });
});
