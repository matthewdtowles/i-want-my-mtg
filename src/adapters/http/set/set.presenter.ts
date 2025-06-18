import { SetMetaResponseDto } from "src/adapters/http/set/dto/set-meta.response.dto";
import { Set } from "src/core/set/set.entity";

export class SetPresenter {

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
            url: `sets/${set.code.toLowerCase()}`,
        });
    }

    static ownedPercentage(baseSize: number, uniqueOwned: number): number {
        if (uniqueOwned > 0 && baseSize > 0) {
            return (uniqueOwned / baseSize) * 100;
        }
        return 0;
    }

    // private static setEntityToDto(set: Set): SetDto {
    //     return {
    //         ...set,
    //         cards: set.cards ? set.cards.map(c => this.entityToDto(c, CardImgType.SMALL)) : [],
    //         url: this.buildSetUrl(set),
    //     };
    // }

    // private static buildSetUrl(set: Set): string {
    //     return `/set/${set.code.toLowerCase()}`;
    // }
}
