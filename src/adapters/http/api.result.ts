export interface ApiResult<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}