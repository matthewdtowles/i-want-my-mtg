import { SetMetaDto } from "src/adapters/http/set/set-meta.dto";
import { Set } from "src/core/set/set.entity";

export class SetPresenter {

    static toSetMetaDto(set: Set, uniqueOwned: number): SetMetaDto {
        return new SetMetaDto({
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

}
