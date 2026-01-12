import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("set_price")
export class SetPriceOrmEntity {
    @PrimaryColumn()
    readonly setCode: string;

    @Column({ name: "base_price" })
    readonly basePrice: number;

    @Column({ name: "total_price" })
    readonly totalPrice: number;

    @Column({ name: "base_price_all" })
    readonly basePriceAll: number;

    @Column({ name: "total_price_all" })
    readonly totalPriceAll: number;

    @Column({ name: "date" })
    readonly lastUpdate: Date;
}