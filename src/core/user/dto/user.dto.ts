import { Type } from "class-transformer";
import { CollectionDto } from "src/core/collection/dto/collection.dto";

export class UserDto {
    readonly id: number;
    readonly email: string;
    readonly name: string;

    @Type(() => CollectionDto)
    readonly collection: CollectionDto;
}