import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMeta {
    @ApiProperty()
    readonly page: number;

    @ApiProperty()
    readonly limit: number;

    @ApiProperty()
    readonly total: number;

    @ApiProperty()
    readonly totalPages: number;

    constructor(page: number, limit: number, total: number) {
        this.page = page;
        this.limit = limit;
        this.total = total;
        this.totalPages = Math.max(1, Math.ceil(total / limit));
    }
}

export class ApiResponseDto<T> {
    @ApiProperty()
    readonly success: boolean;

    @ApiPropertyOptional()
    readonly data?: T;

    @ApiPropertyOptional()
    readonly error?: string;

    @ApiPropertyOptional()
    readonly message?: string;

    @ApiPropertyOptional({ type: PaginationMeta })
    readonly meta?: PaginationMeta;

    constructor(init: {
        success: boolean;
        data?: T;
        error?: string;
        message?: string;
        meta?: PaginationMeta;
    }) {
        this.success = init.success;
        this.data = init.data;
        this.error = init.error;
        this.message = init.message;
        this.meta = init.meta;
    }

    static ok<T>(data: T, meta?: PaginationMeta): ApiResponseDto<T> {
        return new ApiResponseDto({ success: true, data, meta });
    }

    static error(error: string): ApiResponseDto<null> {
        return new ApiResponseDto({ success: false, error });
    }
}
