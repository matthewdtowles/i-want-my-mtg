import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { SetOrmEntity } from "./set.orm-entity";

@Entity("set_price")
export class SetPriceOrmEntity {
    @PrimaryColumn({ name: "set_code" })
    setCode: string;

    @Column({ name: "base_price" })
    basePrice: number;

    @Column({ name: "total_price" })
    totalPrice: number;

    @Column({ name: "base_price_all" })
    basePriceAll: number;

    @Column({ name: "total_price_all" })
    totalPriceAll: number;

    @Column({ name: "date" })
    lastUpdate: Date;

    @OneToOne(() => SetOrmEntity, (set) => set.setPrice)
    @JoinColumn({ name: "set_code" })
    set: SetOrmEntity;
}