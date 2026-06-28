import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('refresh_token')
@Index('idx_refresh_token_user_active', ['userId'], { where: 'revoked_at IS NULL' })
export class RefreshTokenOrmEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'token_hash', unique: true })
    tokenHash: string;

    @Column({ name: 'device_label', nullable: true })
    deviceLabel: string | null;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt: Date;

    @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
    lastUsedAt: Date | null;

    @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
    revokedAt: Date | null;

    @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
    createdAt: Date;
}
