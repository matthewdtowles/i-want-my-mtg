import { UserRole } from "src/adapters/http/auth/auth.types";
import { CardDto } from "src/core/card/api/card.dto";
import { CardRarity } from "src/core/card/api/card.rarity.enum";
import { CreateCardDto } from "src/core/card/api/create-card.dto";
import { Format } from "src/core/card/api/format.enum";
import { LegalityDto } from "src/core/card/api/legality.dto";
import { LegalityStatus } from "src/core/card/api/legality.status.enum";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";
import { InventoryCardDto, InventoryDto } from "src/core/inventory/api/inventory.dto";
import { Inventory } from "src/core/inventory/inventory.entity";
import { PriceDto } from "src/core/price/api/price.dto";
import { Price } from "src/core/price/price.entity";
import { CreateSetDto, SetDto } from "src/core/set/api/set.dto";
import { Set } from "src/core/set/set.entity";
import { toDollar } from "src/shared/utils/formatting.util";

export class TestUtils {
    readonly MOCK_SET_CODE = "SET";
    readonly MOCK_BASE_SIZE = 3;
    readonly MOCK_QUANTITY = 4;

    getMockCreateCardDtos(setCode: string): CreateCardDto[] {
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => ({
            artist: "artist",
            imgSrc: `${i + 1}/a/${i + 1}abc123def456.jpg`,
            isReserved: false,
            legalities: this.getMockLegalities(i + 1),
            manaCost: `{${i + 1}}{W}`,
            name: `Test Card Name ${i + 1}`,
            number: `${i + 1}`,
            oracleText: "Test card text.",
            rarity: i % 2 === 0 ? "common" : "uncommon",
            setCode,
            uuid: `abcd-1234-efgh-5678-ijkl-${setCode}${i + 1}`,
            type: "type",
        }));
    }

    getMockCards(setCode: string): Card[] {
        return this.getMockCreateCardDtos(setCode).map((dto, i) => {
            const card = new Card();
            card.id = i + 1;
            card.artist = dto.artist;
            card.imgSrc = dto.imgSrc;
            card.isReserved = dto.isReserved;
            card.legalities = this.getMockLegalities(i + 1);
            card.manaCost = dto.manaCost;
            card.name = dto.name;
            card.number = dto.number;
            card.oracleText = dto.oracleText;
            card.prices = this.getMockPriceEntities();
            card.set = this.getMockSet(setCode);
            card.setCode = setCode;
            card.rarity = this.convertToCardRarity(dto.rarity);
            return card;
        });
    }

    getMockCardDtos(setCode: string): CardDto[] {
        return this.getMockCards(setCode).map((card) =>
            this.mapCardEntityToDto(card, "small"),
        );
    }

    getMockSets(): Set[] {
        return this.getMockCreateSetDtos().map((dto, i) => ({
            ...dto,
            id: i + 1,
            setCode: dto.code,
            cards: undefined,
        }));
    }

    getMockSet(setCode: string): Set {
        const set: Set = new Set();
        set.code = setCode;
        set.baseSize = this.MOCK_BASE_SIZE;
        set.keyruneCode = this.MOCK_SET_CODE.toLowerCase();
        set.name = "Test Set";
        set.releaseDate = "2022-01-01";
        set.type = "expansion";
        return set;
    }

    getMockSetWithCards(setCode: string): Set {
        const set: Set = this.getMockSet(setCode);
        set.cards = this.getMockCards(setCode);
        return set;
    }

    getMockCreateSetDtos(): CreateSetDto[] {
        const setCodes: string[] = [this.MOCK_SET_CODE, "ETS", "TES"];
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => ({
            baseSize: this.MOCK_BASE_SIZE,
            block: "Test Set",
            code: setCodes[i],
            imgSrc: null,
            keyruneCode: this.MOCK_SET_CODE.toLowerCase(),
            name: "Test Set" + i,
            parentCode: this.MOCK_SET_CODE,
            releaseDate: "2022-01-01",
            type: "expansion",
            url: "sets/" + setCodes[i],
        }));
    }

    getMockCardEntity(): Card {
        return this.getMockCardEntities()[0];
    }

    getMockCardEntities(): Card[] {
        return this.getMockCreateCardDtos(this.MOCK_SET_CODE).map((dto, i) => {
            const card = new Card();
            card.id = i + 1;
            card.artist = dto.artist;
            card.imgSrc = dto.imgSrc;
            card.isReserved = dto.isReserved;
            card.legalities = this.getMockLegalities(i + 1);
            card.manaCost = dto.manaCost;
            card.name = dto.name;
            card.number = dto.number;
            card.oracleText = dto.oracleText;
            card.prices = this.getMockPriceEntities();
            card.setCode = this.MOCK_SET_CODE;
            return card;
        });
    }

    getMockSetDto(setCode: string): SetDto {
        return this.mapSetEntityToDto(this.getMockSet(setCode));
    }

    getMockCreateInventoryDtos(): InventoryDto[] {
        const inventoryDtos: InventoryDto[] = [];
        for (let i = 0; i < this.MOCK_BASE_SIZE; i++) {
            const _cardId = this.getMockCardDtos(this.MOCK_SET_CODE)[i].id;
            const inventoryDto: InventoryDto = {
                userId: 1,
                cardId: _cardId,
                quantity: _cardId % 2 !== 0 ? this.MOCK_QUANTITY : 0,
            };
            inventoryDtos.push(inventoryDto);
        }
        return inventoryDtos;
    }

    getMockInventoryList(): Inventory[] {
        const mockCards = this.getMockCards(this.MOCK_SET_CODE);
        return this.getMockCreateInventoryDtos().map((dto, i) => ({
            id: i + 1,
            userId: dto.userId,
            user: {
                id: 1,
                email: "test-email@iwmmtg.com",
                name: "test-user",
                inventory: [],
                password: "password",
                role: UserRole.User,
            },
            cardId: mockCards[i].id,
            card: mockCards[i],
            quantity: dto.quantity,
        }));
    }

    getMockInventoryCardDtos(): InventoryCardDto[] {
        return this.entityListToInventoryCardDtos(this.getMockInventoryList());
    }

    getMockInventoryDtos(): InventoryDto[] {
        return this.getMockInventoryList().map((inventory) => ({
            userId: inventory.userId,
            cardId: inventory.cardId,
            quantity: inventory.quantity,
        }));
    }

    entityToInventoryCardDto(inventory: Inventory): InventoryCardDto {
        return {
            card: inventory.card ? this.mapCardEntityToDto(inventory.card, "small") : undefined,
            quantity: inventory.quantity,
            userId: inventory.user.id || 0,
        };
    }

    entityListToInventoryCardDtos(inventoryList: Inventory[]): InventoryCardDto[] {
        return inventoryList.map(item => this.entityToInventoryCardDto(item));
    }

    getMockLegalityDto(cardId: number, format: Format, status: LegalityStatus): LegalityDto {
        return {
            cardId: cardId,
            format: format,
            status: status
        };
    }

    getMockLegalities(cardId: number): Legality[] {
        return Object.values(Format).map((format) => ({
            cardId,
            format,
            status: LegalityStatus.Legal
        }));
    }

    mapCardEntityToDto(card: Card, imgSize: string): CardDto {
        return {
            id: card.id,
            artist: card.artist,
            imgSrc: `https://cards.scryfall.io/${imgSize}/front/${card.imgSrc}`,
            isReserved: card.isReserved,
            legalities: card.legalities.map((legality) =>
                this.getMockLegalityDto(
                    legality.cardId,
                    legality.format as Format,
                    legality.status as LegalityStatus,
                )
            ),
            manaCost: card.manaCost ? card.manaCost.toLowerCase().replace(/[{}]/g, "").split("") : undefined,
            name: card.name,
            number: card.number,
            oracleText: card.oracleText,
            prices: card.prices.map((e) => this.mapPriceEntityToDto(e)),
            rarity: card.rarity,
            setCode: card.set.code,
            set: {
                code: "SET",
                baseSize: 3,
                keyruneCode: "set",
                name: "Test Set",
                releaseDate: "2022-01-01",
                type: "expansion",
                cards: [],
                url: "/set/set",
            },
            uuid: card.uuid,
            type: card.type,
            url: `/card/${card.setCode.toLowerCase()}/${card.number}`,
        };
    }

    mapSetEntityToDto(set: Set): SetDto {
        return {
            baseSize: set.baseSize,
            block: set.block,
            cards: set.cards ? this.getMockCardDtos(set.code) : [],
            code: set.code,
            keyruneCode: set.keyruneCode.toLowerCase(),
            name: set.name,
            parentCode: set.parentCode,
            releaseDate: set.releaseDate,
            type: set.type,
            url: "sets/" + set.code.toLowerCase(),
        };
    }

    mapSetEntitiesToDtos(sets: Set[]): SetDto[] {
        return sets.map((set) => this.mapSetEntityToDto(set));
    }

    getMockPriceDtos(): PriceDto[] {
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => ({
            cardId: i + 1,
            foil: i + 10,
            normal: i + 5,
            date: new Date("2022-01-01"),
        }));
    }

    getMockPriceEntities(): Price[] {
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => {
            const price = new Price();
            const card: Card = new Card();
            card.id = i + 1;
            price.card = card;
            price.foil = i + 10;
            price.normal = i + 5;
            price.date =  new Date("2022-01-01");
            return price;
        });
    }

    mapPriceDtoToEntity(dto: PriceDto): Price {
        const price = new Price();
        price.foil = dto.foil;
        price.normal = dto.normal;
        price.date = dto.date;
        return price;
    }

    mapPriceEntityToDto(entity: Price): PriceDto {
        return {
            cardId: entity.card.id,
            foil: entity.foil,
            normal: entity.normal,
            date: entity.date,
        };
    }

    mapPriceEntitiesToDtos(entities: Price[]): PriceDto[] {
        return entities.map((entity) => this.mapPriceEntityToDto(entity));
    }

    private convertToCardRarity(rarity: string): CardRarity {
        if (Object.values(CardRarity).includes(rarity.toLowerCase() as CardRarity)) {
            return rarity as CardRarity;
        }
        return null;
    }

}
