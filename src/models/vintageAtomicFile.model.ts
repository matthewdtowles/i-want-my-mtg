import { Injectable } from '@nestjs/common';
import { CardAtomic } from './cardAtomic.model';
import { Meta } from './meta.model';

@Injectable()
export class VintageAtomicFile { meta: Meta; data: Record<string, CardAtomic>; };