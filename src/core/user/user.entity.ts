import { Collection } from 'src/core/collection/collection.entity';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @OneToOne(() => Collection, collection => collection.owner)
    collection: Collection;
}