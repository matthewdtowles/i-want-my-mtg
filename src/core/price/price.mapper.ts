import { PriceDto } from "src/core/price/api/price.dto";
import { Price } from "src/core/price/price.entity";

export class PriceMapper {

    /**
     * Maps a Price entity to a Price DTO.
     * 
     * @param {Price} price - The Price entity to map.
     * @returns {PriceDto} - The mapped Price DTO.
     */
    toDto(price: Price): PriceDto {
        return {
            id: price.id,
            cardId: price.card.id,
            foilValue: price.foil,
            normalValue: price.normal,
            lastUpdatedAt: price.lastUpdatedAt,
        };
    }

    /**
     * Maps a Price DTO to a Price entity.
     * 
     * @param {PriceDto} priceDto - The Price DTO to map.
     * @returns {Price} - The mapped Price entity.
     */
    toEntity(priceDto: PriceDto): Price {
       const price = new Price();
        price.id = priceDto.id;
        price.foil = priceDto.foilValue;
        price.normal = priceDto.normalValue;
        price.lastUpdatedAt = priceDto.lastUpdatedAt;
        return price;
    }

    /**
     * Maps an array of Price entities to an array of Price DTOs.
     *
     * @param {Price[]} prices - The array of Price entities to map.
     * @returns {PriceDto[]} - The array of mapped Price DTOs.
     */
    toDtos(prices: Price[]): PriceDto[] {
        return prices.map((price) => this.toDto(price));
    }

    /**
     * Maps an array of Price DTOs to an array of Price entities.
     *
     * @param {PriceDto[]} priceDtos - The array of Price DTOs to map.
     * @returns {Price[]} - The array of mapped Price entities.
     */
    toEntities(priceDtos: PriceDto[]): Price[] {
        return priceDtos.map((priceDto) => this.toEntity(priceDto));
    }
}