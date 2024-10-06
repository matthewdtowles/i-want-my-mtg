import { UserDto } from 'src/core/user/dto/user.dto';

export const LocalStrategyPort = 'LocalStrategyPort';

export interface LocalStrategyPort {

    /**
     * Authenticate user by email and password
     * Issue JWT token on success
     * Throw UnauthorizedException otherwise
     * 
     * @param email
     * @param password
     */
    validate(email: string, password: string): Promise<UserDto>;
}