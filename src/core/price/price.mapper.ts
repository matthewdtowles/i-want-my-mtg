import { Card } from "src/core/card/card.entity";
import { CreatePriceDto } from "src/core/price/api/create-price.dto";
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
            foil: price.foil,
            normal: price.normal,
            date: price.date,
        };
    }

    /**
     * Maps a CreatePriceDto and a Card to a Price entity.
     * 
     * @param {CreatePriceDto} priceDto - The DTO containing price details.
     * @param {Card} card - The Card entity associated with the price.
     * @returns {Price} - The mapped Price entity.
     */
    toEntity(priceDto: CreatePriceDto, card: Card): Price {
        const price = new Price();
        price.foil = priceDto.foil;
        price.normal = priceDto.normal;
        price.date = priceDto.date;
        price.card = card;
        return price;
    }
}