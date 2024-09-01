import { Inventory } from 'src/core/inventory/inventory.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @OneToOne(() => Inventory, inventory => inventory.owner)
    inventory: Inventory;
}