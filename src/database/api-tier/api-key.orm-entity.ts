import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('api_key')
@Index('idx_api_key_user_active', ['userId'], { where: 'revoked_at IS NULL' })
export class ApiKeyOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'key_hash', unique: true })
    keyHash: string;

    @Column({ name: 'key_prefix', length: 16 })
    keyPrefix: string;

    @Column()
    name: string;

    @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
    lastUsedAt: Date | null;

    @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
    revokedAt: Date | null;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
    createdAt: Date;
}
