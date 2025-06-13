import { CardOrmEntity } from "src/infrastructure/database/card";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

@Entity("set")
export class SetOrmEntity {
    @PrimaryColumn()
    code: string;

    @Column({ name: "base_size" })
    baseSize: number;

    @Column({ nullable: true })
    block?: string;

    @OneToMany(() => CardOrmEntity, (card) => card.set)
    cards: CardOrmEntity[];

    @Column({ name: "keyrune_code" })
    keyruneCode: string;

    @Column()
    name: string;

    @Column({ name: "parent_code", nullable: true })
    parentCode?: string;

    @Column({ name: "release_date", type: "date" })
    releaseDate: string;

    @Column()
    type: string;
}
