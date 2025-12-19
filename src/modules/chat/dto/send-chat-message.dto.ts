import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SendChatMessageDto {
  @IsOptional()
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId?: string;

  @IsNotEmpty({ message: 'Content is required' })
  @IsString({ message: 'Content must be a string' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content: string;
}
