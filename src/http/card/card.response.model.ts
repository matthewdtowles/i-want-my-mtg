// TODO: just merge this into get-card.dto.ts
// use @Transform(({ value}) => value.name) ,,,, 
// is it possible to use a method call for mana cost mapping???
export class CardResponse {
    imgSrc: string;
    manaCost: string[];
    name: string;
    notes: string[];
    number: string;
    price: number;
    rarity: string;
    setCode: string;
    totalOwned: number;
    url: string;
}