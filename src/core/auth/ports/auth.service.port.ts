import { UserDto } from 'src/core/user/dto/user.dto';
import { AuthToken } from '../auth.types';

export const AuthServicePort = 'AuthServicePort';

export interface AuthServicePort {

    /**
     * Validate and return User if provided credentials are valid
     * 
     * @param email 
     * @param password 
     * @returns UserDto if credentials valid, otherwise null
     */
    validateCredentials(email: string, password: string): Promise<UserDto | null>;

    /**
     * Mints token for given user to use in authorization header of subsequent requests
     * 
     * @param user 
     * @returns minted AuthToken for given user
     */
    login(user: UserDto): Promise<AuthToken>;
}