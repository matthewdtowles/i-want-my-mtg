import { UserDto } from 'src/core/user/dto/user.dto';
import { JwtPayload } from '../auth.types';

export const JwtStrategyPort = 'JwtStrategyPort';

// TODO: keep?
/**
 * Authorization Service/Strategy
 * Validates payload from JWT
 * Used by auth guards in controllers
 */
export interface JwtStrategyPort {

    /**
     * Decode payload, find and return user for valid payload provided
     * 
     * @param payload 
     * @returns validated User
     */
    validate(payload: JwtPayload): Promise<UserDto>;
}