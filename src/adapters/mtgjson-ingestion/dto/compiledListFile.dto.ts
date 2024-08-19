import { Injectable } from '@nestjs/common';
import { Meta } from './meta.dto';

@Injectable()
export class CompiledListFile { meta: Meta; data: string[]; };