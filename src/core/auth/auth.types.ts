export interface AuthToken {

    /**
     * Authorization token used in requests
     */
    access_token: string;
}

export interface JwtPayload {

    username: string; // Username of the user

    /**
     * User's unique ID
     */
    sub: string;
}