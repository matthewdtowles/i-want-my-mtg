import { UserDto } from 'src/core/user/dto/user.dto';

export interface AuthenticatedRequest extends Request {
    user: UserDto;
}