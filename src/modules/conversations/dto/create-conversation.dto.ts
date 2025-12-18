import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;
}

