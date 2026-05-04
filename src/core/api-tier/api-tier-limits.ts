import { ApiTier } from './api-tier.enum';

export interface ApiTierLimits {
    readonly perDay: number;
    readonly perMinute: number;
}

export const API_TIER_LIMITS: Readonly<Record<ApiTier, ApiTierLimits>> = {
    [ApiTier.Free]: { perDay: 100, perMinute: 60 },
    [ApiTier.Developer]: { perDay: 5000, perMinute: 300 },
    [ApiTier.Business]: { perDay: 50000, perMinute: 1000 },
};

export function getTierLimits(tier: ApiTier): ApiTierLimits {
    return API_TIER_LIMITS[tier];
}
