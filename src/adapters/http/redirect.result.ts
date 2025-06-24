export interface RedirectResult {
    success: boolean;
    redirectTo: string;
    statusCode: number;
    token?: string;
    error?: string;
}