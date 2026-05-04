import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('api_usage')
@Index('idx_api_usage_day', ['day'])
export class ApiUsageOrmEntity {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @PrimaryColumn({ type: 'date' })
    day: Date;

    @Column({ name: 'request_count', default: 0 })
    requestCount: number;
}
