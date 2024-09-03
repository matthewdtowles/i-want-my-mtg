import { Inventory } from 'src/core/inventory/inventory.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @OneToMany(() => Inventory, inventory => inventory.user)
    inventory: Inventory[];
}