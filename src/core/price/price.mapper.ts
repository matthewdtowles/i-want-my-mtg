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
            cardId: price.card.id,
            foil: this.toDollar(price.foil),
            normal: this.toDollar(price.normal),
            date: price.date,
        };
    }

    toDollar(number: number): string {
        return number !== null ? number.toFixed(2) : "0.00";
    }

    /**
     * Maps a CreatePriceDto and a Card to a Price entity.
     * 
     * @param {CreatePriceDto} priceDto - The DTO containing price details.
     * @param {number} cardId - The Card entity associated with the price.
     * @returns {Price} - The mapped Price entity.
     */
    toEntity(priceDto: CreatePriceDto, cardId: number): Price {
        const price = new Price();
        const card = new Card();
        card.id = cardId;
        price.card = card;
        price.foil = !isNaN(priceDto.foil) ? priceDto.foil : null;
        price.normal = !isNaN(priceDto.normal) ? priceDto.normal :  null;
        price.date = priceDto.date;
        return price;
    }
}