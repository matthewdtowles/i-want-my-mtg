import { UserRole } from "src/adapters/http/auth/auth.types";
import { Card, CardRarity, Format, LegalityStatus, } from "src/core/card";
import { Inventory } from "src/core/inventory";
import { Price } from "src/core/price";
import { Set } from "src/core/set";


export class TestUtils {
    readonly MOCK_SET_CODE = "SET";
    readonly MOCK_BASE_SIZE = 3;

    mockCards(setCode: string): Card[] {
        return Array.from({ length: 3 }, (_, i) => {
            const card = new Card();
            card.order = i + 1;
            card.artist = "artist";
            card.imgSrc = `${i + 1}/a/${i + 1}abc123def456.jpg`;
            card.isReserved = false;
            card.legalities = Object.values(Format).map((format) => ({
                cardId: i + 1,
                format,
                status: LegalityStatus.Legal
            }));
            card.manaCost = `{${i + 1}}{W}`;
            card.name = `Test Card Name ${i + 1}`;
            card.number = `${i + 1}`;
            card.oracleText = "Test card text.";
            card.rarity = i % 2 === 0 ? "common" as CardRarity : "uncommon" as CardRarity;
            card.set = this.mockSet(setCode),
                card.setCode = setCode;
            card.id = `abcd-1234-efgh-5678-ijkl-${setCode}${i + 1}`;
            card.type = "type",
                card.prices = this.mockPriceEntities();
            return card;
        });
    }

    mockCardDtos(setCode: string): CardDto[] {
        return this.mockCards(setCode).map((card) => ({
            id: card.order,
            artist: card.artist,
            hasFoil: false,
            hasNonFoil: true,
            imgSrc: `https://cards.scryfall.io/small/front/${card.imgSrc}`,
            isReserved: card.isReserved,
            legalities: card.legalities.map((legality) => ({
                cardId: legality.cardId,
                format: legality.format as Format,
                status: legality.status as LegalityStatus,
            })),
            manaCost: card.manaCost ? card.manaCost.toLowerCase().replace(/[{}]/g, "").split("") : undefined,
            name: card.name,
            number: card.number,
            oracleText: card.oracleText,
            prices: card.prices.map((e) => {
                return {
                    cardId: e.card.order,
                    foil: e.foil,
                    normal: e.normal,
                    date: e.date,
                };
            }),
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
            uuid: card.id,
            type: card.type,
            url: `/card/${card.setCode.toLowerCase()}/${card.number}`,
        }));
    }

    mockSet(setCode: string): Set {
        const set: Set = new Set();
        set.code = setCode;
        set.baseSize = this.MOCK_BASE_SIZE;
        set.keyruneCode = this.MOCK_SET_CODE.toLowerCase();
        set.name = "Test Set";
        set.releaseDate = "2022-01-01";
        set.type = "expansion";
        return set;
    }

    mockCreateInventoryDtos(): InventoryDto[] {
        const inventoryDtos: InventoryDto[] = [];
        for (let i = 0; i < this.MOCK_BASE_SIZE; i++) {
            const _cardId = this.mockCardDtos(this.MOCK_SET_CODE)[i].order;
            const inventoryDto: InventoryDto = {
                userId: 1,
                isFoil: false,
                cardId: _cardId,
                quantity: _cardId % 2 !== 0 ? 4 : 0,
            };
            inventoryDtos.push(inventoryDto);
        }
        return inventoryDtos;
    }

    mockInventoryList(): Inventory[] {
        const mockCards = this.mockCards(this.MOCK_SET_CODE);
        return this.mockCreateInventoryDtos().map((dto, i) => ({
            id: i + 1,
            userId: dto.userId,
            isFoil: false,
            user: {
                id: 1,
                email: "test-email@iwmmtg.com",
                name: "test-user",
                inventory: [],
                password: "password",
                role: UserRole.User,
            },
            cardId: mockCards[i].order,
            card: mockCards[i],
            quantity: dto.quantity,
        }));
    }

    mockInventoryDtos(): InventoryDto[] {
        return this.mockInventoryList().map((inventory) => ({
            card: null,
            userId: inventory.userId,
            isFoil: inventory.isFoil,
            cardId: inventory.cardId,
            quantity: inventory.quantity,
        }));
    }

    mockPriceEntities(): Price[] {
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => {
            const price = new Price();
            const card: Card = new Card();
            card.order = i + 1;
            price.card = card;
            price.foil = i + 10;
            price.normal = i + 5;
            price.date = new Date("2022-01-01");
            return price;
        });
    }
}
