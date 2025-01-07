import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Card } from "./card.entity";
import { Format } from "./format.enum";

@Entity()
export class Legality {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Card, (card) => card.legalities)
    card: Card;

    @Column({
        type: "enum",
        enum: Format,
    })
    format: Format;

    @Column()
    status: string;
}