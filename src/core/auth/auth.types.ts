export interface AuthToken {
    /**
     * Authorization token used in requests
     */
    access_token: string;
}

export interface JwtPayload {
    /**
     * User's unique ID
     */
    sub: string;
    email: string;
    role: string;
}
