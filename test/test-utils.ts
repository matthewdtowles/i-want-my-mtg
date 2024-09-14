import { CreateInventoryDto } from 'src/core/inventory/dto/create-inventory.dto';
import { InventoryDto } from 'src/core/inventory/dto/inventory.dto';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { CreateSetDto } from 'src/core/set/dto/create-set.dto';
import { SetDto } from 'src/core/set/dto/set.dto';
import { CreateUserDto } from 'src/core/user/dto/create-user.dto';
import { UserDto } from 'src/core/user/dto/user.dto';
import { User } from 'src/core/user/user.entity';
import { Card } from '../src/core/card/card.entity';
import { CardDto } from '../src/core/card/dto/card.dto';
import { CreateCardDto } from '../src/core/card/dto/create-card.dto';
import { Set } from '../src/core/set/set.entity';

export class TestUtils {
    readonly MOCK_SET_CODE = 'SET';
    readonly MOCK_SET_NAME = 'Test Set';
    readonly MOCK_CARD_NAME = 'Test Card Name';
    readonly MOCK_SET_URL = 'sets/set';
    readonly MOCK_ROOT_SCRYFALL_ID = 'abc123def456';
    readonly IMG_SRC_BASE = 'https://cards.scryfall.io/normal/front/';
    readonly MOCK_SET_RELEASE_DATE = '2022-01-01';
    readonly MOCK_USER_ID = 1;
    readonly MOCK_BASE_SIZE = 3;
    readonly MOCK_USER_EMAIL = 'test-email@iwmmtg.com';
    readonly MOCK_USER_NAME = 'test-user';

    getMockCreateCardDtos(setCode: string): CreateCardDto[] {
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => ({
            imgSrc: `${this.IMG_SRC_BASE}${i + 1}/a/${i + 1}${this.MOCK_ROOT_SCRYFALL_ID}.jpg`,
            isReserved: false,
            manaCost: `{${i + 1}}{W}`,
            name: `${this.MOCK_CARD_NAME} ${i + 1}`,
            number: `${i + 1}`,
            originalText: 'Test card text.',
            rarity: i % 2 === 0 ? 'common' : 'uncommon',
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
        return this.getMockCards(setCode).map(card => this.mapCardEntityToDto(card));
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
        set.name = 'Test Set';
        set.releaseDate = '2022-01-01';
        set.type = 'expansion';
        return set;
    }

    getMockCreateSetDtos(): CreateSetDto[] {
        const setCodes: string[] = [
            this.MOCK_SET_CODE,
            'ETS',
            'TES',
        ];
        return Array.from({ length: this.MOCK_BASE_SIZE }, (_, i) => ({
            baseSize: this.MOCK_BASE_SIZE,
            block: this.MOCK_SET_NAME,
            code: setCodes[i],
            imgSrc: null,
            keyruneCode: this.MOCK_SET_CODE.toLowerCase(),
            name: this.MOCK_SET_NAME + i,
            parentCode: this.MOCK_SET_CODE,
            releaseDate: this.MOCK_SET_RELEASE_DATE,
            type: 'expansion',
            url: 'sets/' + setCodes[i]
        }));
    }

    getMockSetDtos(): SetDto[] {
        return this.getMockSets().map(set => this.mapSetEntityToDto(set));
    }

    getMockCreateInventoryDtos(): CreateInventoryDto[] {
        const inventoryDtos: CreateInventoryDto[] = [];
        for (let i = 0; i < this.MOCK_BASE_SIZE; i++) {
            const inventoryDto: CreateInventoryDto = {
                userId: this.MOCK_USER_ID,
                cardId: this.getMockCardDtos(this.MOCK_SET_CODE)[i].id,
                quantity: this.MOCK_BASE_SIZE
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
            user: { id: this.MOCK_USER_ID, email: this.MOCK_USER_EMAIL, name: this.MOCK_USER_NAME, inventory: [] },
            cardId: mockCards[i].id,
            card: mockCards[i],
            quantity: dto.quantity
        }));
    }

    getMockInventoryDtos(): InventoryDto[] {
        const inventoryDtos: InventoryDto[] = [];
        this.getMockInventoryList().forEach(item => {
            inventoryDtos.push(this.mapInventoryEntityToDto(item));
        })
        return inventoryDtos;
    }

    getMockCreateUserDto(): CreateUserDto {
        const user: CreateUserDto = {
            email: this.MOCK_USER_EMAIL,
            name: this.MOCK_USER_NAME
        };
        return user;
    }

    getMockUser(): User {
        const userDto = this.getMockCreateUserDto();
        const user: User = {
            id: this.MOCK_USER_ID,
            email: userDto.email,
            name: userDto.name,
            inventory: this.getMockInventoryList()
        };
        return user;
    }

    getMockUserDto(): UserDto {
        const user: User = this.getMockUser();
        const userDto: UserDto = {
            id: user.id,
            email: user.email,
            name: user.name,
            inventory: this.mapInventoryEntityListToDtos(user.inventory)
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
            rarity: card.rarity,
            setCode: card.set.code,
            url: card.url,
            uuid: card.uuid,
        };
    }

    mapCardEntitiesToDtos(cards: Card[]): CardDto[] {
        return cards.map(card => this.mapCardEntityToDto(card));
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
            url: 'sets/' + set.code.toLowerCase()
        };
    }

    mapSetEntitiesToDtos(sets: Set[]): SetDto[] {
        return sets.map(set => this.mapSetEntityToDto(set));
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
            rarity: cardDto.rarity,
            set: this.getMockSet(cardDto.setCode),
            setCode: cardDto.setCode,
            url: cardDto.url,
            uuid: cardDto.uuid,
        };
    }

    mapInventoryEntityToDto(inventory: Inventory): InventoryDto {
        const dto: InventoryDto = {
            cardId: inventory.cardId,
            quantity: inventory.quantity,
            userId: inventory.userId
        };
        return dto;
    }

    mapInventoryEntityListToDtos(inventoryList: Inventory[]): InventoryDto[] {
        const dtos: InventoryDto[] = [];
        inventoryList.forEach(item => {
            dtos.push(this.mapInventoryEntityToDto(item));
        });
        return dtos;
    }

    private manaCostToArray(manaCost: string | undefined): string[] | undefined {
        return manaCost ? manaCost.toLowerCase().replace(/[{}]/g, '').split('') : undefined;
    }

    private manaCostToString(manaCost: string[] | undefined): string | undefined {
        return manaCost ? manaCost.map(token => `{${token}}`).join('') : undefined;
    }
}
