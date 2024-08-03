import { Card } from '../card/card';
import { Column, OneToMany, PrimaryColumn } from 'typeorm';

export class Set {

    setCode: string;
    baseSize: number;
    block?: string;
    cards: Card[];
    keyruneCode: string;
    name: string;
    releaseDate: string;
    type: string;
}