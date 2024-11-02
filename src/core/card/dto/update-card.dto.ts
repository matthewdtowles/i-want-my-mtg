import { PartialType } from "@nestjs/mapped-types";
import { IsInt, IsPositive } from "class-validator";
import { CreateCardDto } from "./create-card.dto";

export class UpdateCardDto extends PartialType(CreateCardDto) {
    @IsInt()
    @IsPositive()
    id: number;
}
