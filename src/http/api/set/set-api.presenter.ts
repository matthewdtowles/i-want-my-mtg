import { Set } from 'src/core/set/set.entity';
import { SetTypeMapper } from 'src/http/base/set-type.mapper';
import { SetApiResponseDto } from './dto/set-response.dto';

export class SetApiPresenter {
    static toSetApiResponse(set: Set): SetApiResponseDto {
        return {
            code: set.code,
            name: set.name,
            type: set.type,
            releaseDate: set.releaseDate,
            baseSize: set.baseSize,
            totalSize: set.totalSize,
            keyruneCode: set.keyruneCode,
            block: set.block,
            parentCode: set.parentCode,
            isMain: set.isMain,
            tags: SetTypeMapper.mapSetTypeToTags(set),
            prices: set.prices
                ? {
                      basePrice: set.prices.basePrice,
                      totalPrice: set.prices.totalPrice,
                      basePriceAll: set.prices.basePriceAll,
                      totalPriceAll: set.prices.totalPriceAll,
                      basePriceChangeWeekly: set.prices.basePriceChangeWeekly,
                      totalPriceChangeWeekly: set.prices.totalPriceChangeWeekly,
                  }
                : undefined,
        };
    }
}
