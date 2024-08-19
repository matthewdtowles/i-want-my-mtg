import { Type } from "class-transformer";
import { CollectionDto } from "src/core/collection/dto/collection.dto";

export class UserDto {
    readonly id: number;
    readonly email: string;
    readonly username: string;

    // TODO: hashed password as part of this ??
    
    @Type(() => CollectionDto)
    readonly collection: CollectionDto;
}