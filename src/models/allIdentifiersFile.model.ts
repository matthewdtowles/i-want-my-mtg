import { Injectable } from '@nestjs/common';
import { CardSet } from './cardSet.model';
import { Meta } from './meta.model';

@Injectable()
export class AllIdentifiersFile { 
    meta: Meta; 
    data: Record<string, CardSet>; 
}