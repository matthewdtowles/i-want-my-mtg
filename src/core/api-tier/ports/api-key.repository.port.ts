import { ApiKey } from '../api-key.entity';

export const ApiKeyRepositoryPort = 'ApiKeyRepositoryPort';

export interface ApiKeyRepositoryPort {
    create(apiKey: ApiKey): Promise<ApiKey>;
    findByHash(keyHash: string): Promise<ApiKey | null>;
    findActiveByUserId(userId: number): Promise<ApiKey | null>;
    findAllByUserId(userId: number): Promise<ApiKey[]>;
    revoke(id: number, when: Date): Promise<void>;
    touchLastUsed(id: number, when: Date): Promise<void>;
}
