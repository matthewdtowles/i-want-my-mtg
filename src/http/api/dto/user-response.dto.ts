import { ApiProperty } from '@nestjs/swagger';

export class UserApiResponseDto {
    @ApiProperty()
    readonly id: number;

    @ApiProperty()
    readonly email: string;

    @ApiProperty()
    readonly name: string;

    @ApiProperty()
    readonly role: string;
}
