import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTodoDto {
    @ApiProperty({ example: 'Buy milk' })
    @IsString()
    @IsNotEmpty()
    title!: string;
}
