import { CreateCardDto } from "src/card/dto/create-card.dto";

export class CreateSetDto {
    block: string;
    cards: CreateCardDto[];
    code: string;
    keyruneCode: string;
    name: string;
    releaseDate: string;
    url: string;
}