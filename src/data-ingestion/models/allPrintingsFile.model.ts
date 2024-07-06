import { Injectable } from '@nestjs/common';
import { Meta } from './meta.model';
import { Set } from './set.model';

@Injectable()
export class AllPrintingsFile { meta: Meta; data: Record<string, Set>; };