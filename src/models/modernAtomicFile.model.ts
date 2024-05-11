import { Injectable } from '@nestjs/common';
import { CardAtomic } from './cardAtomic.model';
import { Meta } from './meta.model';

@Injectable()
export class ModernAtomicFile { meta: Meta; data: Record<string, CardAtomic>; };