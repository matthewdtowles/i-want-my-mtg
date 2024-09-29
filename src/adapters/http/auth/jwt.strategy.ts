import { JwtPayload } from "src/core/auth/auth.types";
import { JwtStrategyPort } from "src/core/auth/ports/jwt.strategy.port";
import { UserDto } from "src/core/user/dto/user.dto";

export class JwtStrategy implements JwtStrategyPort {

    validate(payload: JwtPayload): Promise<UserDto> {
        throw new Error("Method not implemented.");
    }

}