import { Injectable } from "@nestjs/common";

@Injectable()
export class DeckList {
    code: string;
    fileName: string;
    name: string;
    releaseDate: string | null;
    type: string;
};