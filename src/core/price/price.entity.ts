import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Price {
    @PrimaryColumn()
    cardId: number;

    @Column({ type: 'decimal', nullable: true })
    foil: number | null;

    @Column({ type: 'decimal', nullable: true })
    normal: number | null;

    @Column({ type: "date" })
    date: Date;
}
