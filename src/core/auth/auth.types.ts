export interface AuthToken {
    /**
     * Authorization token used in requests
     */
    access_token: string;
}

export interface AuthTokenPair {
    /** Short-lived JWT used in Authorization headers. */
    accessToken: string;
    /** Long-lived opaque token exchanged at /auth/refresh for a new access token. */
    refreshToken: string;
}

export interface JwtPayload {
    /**
     * User's unique ID
     */
    sub: string;
    email: string;
    role: string;
}
