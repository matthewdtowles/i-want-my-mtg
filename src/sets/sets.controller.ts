import { Controller, Get, Param } from '@nestjs/common';

@Controller('sets')
export class SetsController {
    @Get()
    async setListing(): Promise<string> {
        return 'This is the sets page';
    }

    @Get(':setCode')
    async getSetBySetCode(@Param('setCode') setCode: string): Promise<string> {
        setCode = setCode.toUpperCase();
        // return call to the service
        return `Chosen setCode: ${setCode}`;
    }
}
