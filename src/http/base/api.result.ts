export interface ApiResult<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export function createSuccessResult<T>(data: T, message?: string): ApiResult<T> {
    return {
        success: true,
        data,
        message,
    };
}

export function createErrorResult(error: Error | string): ApiResult<null> {
    const errorMessage = error instanceof Error ? error.message : error;
    return {
        success: false,
        data: null,
        error: errorMessage,
    };
}
