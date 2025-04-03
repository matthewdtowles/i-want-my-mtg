import { Logger, Inject } from "@nestjs/common";
import { PriceRepositoryPort } from "src/core/price/api/price.repository.port";
import { PriceServicePort } from "src/core/price/api/price.service.port";
import { PriceMapper } from "src/core/price/price.mapper";

export class PriceService implements PriceServicePort {
    private readonly LOGGER = new Logger(PriceService.name);

    constructor(
        @Inject(PriceRepositoryPort) private readonly repository: PriceRepositoryPort,
        @Inject(PriceMapper) private readonly mapper: PriceMapper,
    ) { }
        //const existingPrice: Price = await this.findById(price.id);
        //const updatedPrice = this.priceRepository.merge(price, existingPrice);
}