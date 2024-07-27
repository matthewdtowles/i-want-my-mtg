import { Injectable } from '@nestjs/common';
import { Set } from './entities/set.entity';

@Injectable()
export class SetService {

    // TODO: create Service ports - this will implement that port 
        // and the port will be used by adapters


    async findAll(): Promise<Set[]> {
        return null;
    }

    async findByCode(setCode: string): Promise<Set> {
        return null;
    }



}
