import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Price {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: "card_id" })
    cardId: number;

    @Column({ type: 'decimal', nullable: true })
    foil: number | null;

    @Column({ type: 'decimal', nullable: true })
    normal: number | null;

    @Column({ type: "date" })
    date: Date;
}
