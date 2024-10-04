import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Trigger local auth strategy to validate  email and password during login
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') { }