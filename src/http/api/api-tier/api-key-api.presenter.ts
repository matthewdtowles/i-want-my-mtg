import { ApiKey } from 'src/core/api-tier/api-key.entity';
import { ApiKeyDto, CreatedApiKeyDto } from './dto/api-key-response.dto';

export class ApiKeyApiPresenter {
    static toDto(apiKey: ApiKey): ApiKeyDto {
        return {
            id: apiKey.id ?? 0,
            name: apiKey.name,
            keyPrefix: apiKey.keyPrefix,
            lastUsedAt: apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : null,
            revokedAt: apiKey.revokedAt ? apiKey.revokedAt.toISOString() : null,
            createdAt: apiKey.createdAt.toISOString(),
        };
    }

    static toCreatedDto(apiKey: ApiKey, rawKey: string): CreatedApiKeyDto {
        return { ...this.toDto(apiKey), rawKey };
    }
}
