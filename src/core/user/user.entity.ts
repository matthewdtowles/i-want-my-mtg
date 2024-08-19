import { Collection } from 'src/core/collection/collection.entity';
import { Column, Entity, Index, JoinTable, ManyToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @Column()
    password: string;

    @OneToOne(() => Collection, collection => collection.owner)
    @Index()
    collection: Collection;
}