import { Injectable } from '@nestjs/common';
import { AuthServicePort } from 'src/core/auth/ports/auth.service.port';

@Injectable()
export class AuthService implements AuthServicePort {

}