import { Injectable } from "@nestjs/common";

@Injectable()
export class Rulings {
    date: string;
    text: string;
}