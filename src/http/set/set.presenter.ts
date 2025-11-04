import { Set } from "src/core/set/set.entity";
import { SetMetaResponseDto } from "./dto/set-meta.response.dto";

export class SetPresenter {

    // TODO: get unique owned count for all sets
    static toSetMetaDto(set: Set, uniqueOwned: number): SetMetaResponseDto {
        return new SetMetaResponseDto({
            block: set.block ?? set.name,
            code: set.code,
            keyruneCode: set.keyruneCode,
            name: set.name,
            completionRate: SetPresenter.ownedPercentage(set.baseSize, uniqueOwned),
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
}
