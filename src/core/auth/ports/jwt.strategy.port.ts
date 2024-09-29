import { UserDto } from 'src/core/user/dto/user.dto';
import { JwtPayload } from '../auth.types';

export const JwtStrategyPort = 'JwtStrategyPort';

export interface JwtStrategyPort {

    /**
     * Find and return user for valid payload provided
     * 
     * @param payload 
     * @returns validated User
     */
    validate(payload: JwtPayload): Promise<UserDto>;
}