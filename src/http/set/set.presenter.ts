import { CardPresenter } from "src/http/card/card.presenter";
import { InventoryPresenter } from "src/http/inventory/inventory.presenter";
import { InventoryQuantities } from "src/http/inventory/inventory.quantities";
import { SetMetaResponseDto } from "src/http/set/dto/set-meta.response.dto";
import { SetResponseDto } from "src/http/set/dto/set.response.dto";
import { Card } from "src/core/card/card.entity";
import { CardImgType } from "src/core/card/card.img.type.enum";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Set } from "src/core/set/set.entity";

export class SetPresenter {

    static toSetResponseDto(set: Set, inventory: Inventory[]): SetResponseDto {
        if (!set) {
            throw new Error("Set is required to create SetResponseDto");
        }
        const inventoryQuantities: Map<string, InventoryQuantities> = InventoryPresenter.toQuantityMap(inventory);
        return new SetResponseDto({
            block: set.block,
            code: set.code,
            keyruneCode: set.keyruneCode,
            name: set.name,
            ownedPercentage: SetPresenter.ownedPercentage(set.baseSize, inventory.length),
            ownedValue: this.calculateOwnedValue(set.cards, inventory),
            releaseDate: set.releaseDate,
            totalValue: this.calculateTotalValue(set.cards),
            url: `/sets/${set.code.toLowerCase()}`,
            cards: set.cards ? set.cards.map(card => {
                return CardPresenter.toCardResponse(card, inventoryQuantities.get(card.id), CardImgType.SMALL)
            }) : [],
        });
    }

    // TODO: get unique owned count for all sets
    static toSetMetaDto(set: Set, uniqueOwned: number): SetMetaResponseDto {
        return new SetMetaResponseDto({
            block: set.block,
            code: set.code,
            keyruneCode: set.keyruneCode,
            name: set.name,
            ownedPercentage: SetPresenter.ownedPercentage(set.baseSize, uniqueOwned),
            ownedValue: "0.00", // TODO: impl setValue dto and new repo, svc methods to calculate
            releaseDate: set.releaseDate,
            totalValue: "0.00", // TODO: impl setValue dto and new repo, svc methods to calculate
            url: `/sets/${set.code.toLowerCase()}`,
        });
    }

    static ownedPercentage(baseSize: number, uniqueOwned: number): number {
        if (uniqueOwned > 0 && baseSize > 0) {
            return (uniqueOwned / baseSize) * 100;
        }
        return 0;
    }

    static calculateOwnedValue(cards: Card[], inventory: Inventory[]): string {
        return "0.00"; // TODO: implement logic to calculate owned value based on cards and inventory
    }

    static calculateTotalValue(cards: Card[]): string {
        return "0.00"; // TODO: implement logic to calculate total value based on cards
    }
}
