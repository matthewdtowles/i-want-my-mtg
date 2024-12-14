import { UserRole } from "src/adapters/http/auth/auth.types";
import { InventoryCardAggregateDto } from "src/core/aggregator/api/aggregate.dto";
import { CardDto, CreateCardDto } from "src/core/card/api/card.dto";
import { Card } from "src/core/card/card.entity";
import { InventoryCardDto, InventoryDto } from "src/core/inventory/api/inventory.dto";
import { Inventory } from "src/core/inventory/inventory.entity";
import { CreateSetDto, SetDto } from "src/core/set/api/set.dto";
import { Set } from "src/core/set/set.entity";
import { CreateUserDto, UserDto } from "src/core/user/api/user.dto";
import { User } from "src/core/user/user.entity";

export class TestUtils {
    readonly MOCK_SET_CODE = "SET";
    readonly MOCK_SET_NAME = "Test Set";
    readonly MOCK_CARD_NAME = "Test Card Name";
    readonly MOCK_SET_URL = "sets/set";
    readonly MOCK_ROOT_SCRYFALL_ID = "abc123def456";
    readonly IMG_SRC_BASE = "https://cards.scryfall.io/normal/front/";
    readonly MOCK_SET_RELEASE_DATE = "2022-01-01";
    readonly MOCK_USER_ID = 1;
    readonly MOCK_BASE_SIZE = 3;
    readonly MOCK_QUANTITY = 4;
    readonly MOCK_USER_EMAIL = "test-email@iwmmtg.com";
    readonly MOCK_USER_NAME = "test-user";
    readonly MOCK_PASSWORD = "password";

    getMockCreateCardDtos(setCode: string): CreateCardDto[] {
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => ({
            imgSrc: `${this.IMG_SRC_BASE}${i + 1}/a/${i + 1}${this.MOCK_ROOT_SCRYFALL_ID}.jpg`,
            isReserved: false,
            manaCost: `{${i + 1}}{W}`,
            name: `${this.MOCK_CARD_NAME} ${i + 1}`,
            number: `${i + 1}`,
            originalText: "Test card text.",
            rarity: i % 2 === 0 ? "Common" : "Uncommon",
            setCode,
            url: `${this.MOCK_SET_URL}/${i + 1}`,
            uuid: `abcd-1234-efgh-5678-ijkl-${setCode}${i + 1}`,
        }));
    }

    getMockCards(setCode: string): Card[] {
        return this.getMockCreateCardDtos(setCode).map((dto, index) => ({
            ...dto,
            id: index + 1,
            manaCost: dto.manaCost,
            set: this.getMockSet(setCode),
        }));
    }

    getMockCardDtos(setCode: string): CardDto[] {
        return this.getMockCards(setCode).map((card) =>
            this.mapCardEntityToDto(card),
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
            block: this.MOCK_SET_NAME,
            code: setCodes[i],
            imgSrc: null,
            keyruneCode: this.MOCK_SET_CODE.toLowerCase(),
            name: this.MOCK_SET_NAME + i,
            parentCode: this.MOCK_SET_CODE,
            releaseDate: this.MOCK_SET_RELEASE_DATE,
            type: "expansion",
            url: "sets/" + setCodes[i],
        }));
    }

    getMockSetDtos(): SetDto[] {
        return this.getMockSets().map((set) => this.mapSetEntityToDto(set));
    }

    getMockSetDto(setCode: string): SetDto {
        return this.mapSetEntityToDto(this.getMockSet(setCode));
    }

    getMockSetDtoWithCards(setCode: string): SetDto {
        return this.mapSetEntityToDto(this.getMockSetWithCards(setCode));
    }

    getMockCreateInventoryDtos(): InventoryDto[] {
        const inventoryDtos: InventoryDto[] = [];
        for (let i = 0; i < this.MOCK_BASE_SIZE; i++) {
            const _cardId = this.getMockCardDtos(this.MOCK_SET_CODE)[i].id;
            const inventoryDto: InventoryDto = {
                userId: this.MOCK_USER_ID,
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
                id: this.MOCK_USER_ID,
                email: this.MOCK_USER_EMAIL,
                name: this.MOCK_USER_NAME,
                inventory: [],
                password: this.MOCK_PASSWORD,
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

    getMockInventoryCardAggregateDtos(): InventoryCardAggregateDto[] {
        const inventory = this.getMockInventoryCardDtos();
        return this.getMockCardDtos(this.MOCK_SET_CODE).map((card: CardDto) => ({
            ...card,
            id: card.id,
            quantity: inventory.find((item: InventoryCardDto) => item.card.id === card.id).quantity ?? 0,
        }));
    }

    entityToInventoryCardDto(inventory: Inventory): InventoryCardDto {
        return {
            card: inventory.card ? this.mapCardEntityToDto(inventory.card) : undefined,
            quantity: inventory.quantity,
            userId: inventory.user.id || 0,
        };
    }

    entityListToInventoryCardDtos(inventoryList: Inventory[]): InventoryCardDto[] {
        return inventoryList.map(item => this.entityToInventoryCardDto(item));
    }

    getMockCreateUserDto(): CreateUserDto {
        const user: CreateUserDto = {
            email: this.MOCK_USER_EMAIL,
            name: this.MOCK_USER_NAME,
            password: this.MOCK_PASSWORD,
        };
        return user;
    }

    getMockUser(): User {
        const userDto = this.getMockCreateUserDto();
        const user: User = {
            id: this.MOCK_USER_ID,
            email: userDto.email,
            name: userDto.name,
            password: this.MOCK_PASSWORD,
            role: UserRole.User,
        };
        return user;
    }

    getMockUserDto(): UserDto {
        const user: User = this.getMockUser();
        const userDto: UserDto = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        return userDto;
    }

    mapCardEntityToDto(card: Card): CardDto {
        return {
            id: card.id,
            imgSrc: card.imgSrc,
            isReserved: card.isReserved,
            manaCost: this.manaCostToArray(card.manaCost),
            name: card.name,
            number: card.number,
            originalText: card.originalText,
            rarity: card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1),
            setCode: card.set.code,
            url: card.url,
            uuid: card.uuid,
        };
    }

    mapCardEntitiesToDtos(cards: Card[]): CardDto[] {
        return cards.map((card) => this.mapCardEntityToDto(card));
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

    mapCardDtoToEntity(cardDto: CardDto): Card {
        return {
            id: cardDto.id,
            imgSrc: cardDto.imgSrc,
            isReserved: cardDto.isReserved,
            manaCost: this.manaCostToString(cardDto.manaCost),
            name: cardDto.name,
            number: cardDto.number,
            originalText: cardDto.originalText,
            rarity: cardDto.rarity.toLowerCase(),
            set: this.getMockSet(cardDto.setCode),
            setCode: cardDto.setCode,
            url: cardDto.url,
            uuid: cardDto.uuid,
        };
    }

    private manaCostToArray(manaCost: string | undefined): string[] | undefined {
        return manaCost ? manaCost.toLowerCase().replace(/[{}]/g, "").split("") : undefined;
    }

    private manaCostToString(manaCost: string[] | undefined): string | undefined {
        return manaCost ? manaCost.map((token) => `{${token}}`).join("") : undefined;
    }
}
