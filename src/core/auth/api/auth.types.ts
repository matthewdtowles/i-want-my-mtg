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
    // TODO: remove role; lookup on RoleGuarded pages by user ID
    role: string;
}
