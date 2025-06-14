import { Card } from "src/core/card/card.entity";
import { CardRarity } from "src/core/card/card.rarity.enum";
import { Format } from "src/core/card/format.enum";
import { Legality } from "src/core/card/legality.entity";
import { LegalityStatus } from "src/core/card/legality.status.enum";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Price } from "src/core/price/price.entity";
import { UserRole } from "src/shared/constants/user.role.enum";
import { Set } from "src/core/set/set.entity";


export class TestUtils {
    readonly MOCK_SET_CODE = "SET";
    readonly MOCK_BASE_SIZE = 3;

    mockCards(setCode: string): Card[] {
        return Array.from({ length: 3 }, (_, i) => {
            const card = new Card({
                order: i + 1,
                artist: "artist",
                imgSrc: `${i + 1}/a/${i + 1}abc123def456.jpg`,
                isReserved: false,
                legalities: Object.values(Format).map((format) => (
                    new Legality({
                        cardId: String(i + 1),
                        format,
                        status: LegalityStatus.Legal
                    }))),
                manaCost: `{${i + 1}}{W}`,
                name: `Test Card Name ${i + 1}`,
                number: `${i + 1}`,
                oracleText: "Test card text.",
                rarity: i % 2 === 0 ? CardRarity.Common : CardRarity.Uncommon,
                set: this.mockSet(setCode),
                setCode: setCode,
                id: `abcd-1234-efgh-5678-ijkl-${setCode}${i + 1}`,
                type: "type",
                prices: this.mockPrices(),
            });
            return card;
        });
    }

    mockSet(setCode: string): Set {
        const set: Set = new Set({
            code: setCode,
            baseSize: this.MOCK_BASE_SIZE,
            keyruneCode: setCode.toLowerCase(),
            name: "Test Set",
            releaseDate: "2022-01-01",
            type: "expansion",
        });
        return set;
    }

    mockWriteInventoryList(): Inventory[] {
        const inventoryDtos: Inventory[] = [];
        for (let i = 0; i < this.MOCK_BASE_SIZE; i++) {
            const _cardId = this.mockCards(this.MOCK_SET_CODE)[i].id;
            const inventoryDto: Inventory = {
                userId: 1,
                isFoil: false,
                cardId: _cardId,
                quantity: parseInt(_cardId) % 2 !== 0 ? 4 : 0,
            };
            inventoryDtos.push(inventoryDto);
        }
        return inventoryDtos;
    }

    mockReadInventoryList(): Inventory[] {
        const mockCards = this.mockCards(this.MOCK_SET_CODE);
        return this.mockWriteInventoryList().map((dto, i) => ({
            id: String(i + 1),
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
            cardId: mockCards[i].id,
            card: mockCards[i],
            quantity: dto.quantity,
        }));
    }

    mockPrices(): Price[] {
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => {
            return new Price({
                cardId: String(i + 1),
                foil: i + 10,
                normal: i + 5,
                date: new Date("2022-01-01"),
            });
        });
    }
}
