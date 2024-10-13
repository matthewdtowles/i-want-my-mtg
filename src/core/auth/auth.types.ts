export interface AuthToken {
  /**
   * Authorization token used in requests
   */
  access_token: string;
}

export interface JwtPayload {
  email: string;

  /**
   * User's unique ID
   */
  sub: string;
}
