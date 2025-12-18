import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title?: string;
}
