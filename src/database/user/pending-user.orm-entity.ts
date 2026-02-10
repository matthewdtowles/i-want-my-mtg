import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('pending_user')
export class PendingUserOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    email: string;

    @Column()
    name: string;

    @Column({ name: 'password_hash' })
    passwordHash: string;

    @Column({ name: 'verification_token', unique: true })
    verificationToken: string;

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
