import { Collection } from 'src/core/collection/collection';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class UserEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column({ unique: true })
    name: string;

    @Column()
    password: string;

    @Column()
    collection: Collection;
}