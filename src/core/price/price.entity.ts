import { IsString, IsNotEmpty, IsNumber, IsDate } from "class-validator";
import { Card } from "src/core/card/card.entity";
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";

@Entity()
export class Price {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsString()
    @IsNotEmpty()
    currency: string;

    @Column()
    @IsNumber()
    @IsNotEmpty()
    value: number;

    @Column()
    @IsDate()
    @IsNotEmpty()
    date: Date;

    @ManyToOne(() => Card, (card) => card.price, { cascade: true })
    @IsNotEmpty()
    @JoinColumn()
    card: Card;

    @Column()
    @IsString()
    @IsNotEmpty()
    provider: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    url: string;

    @Column()
    @IsString()
    @IsNotEmpty()
    uuid: string;
}
