import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { MessageSender } from '@database/entities/message.entity';

export class CreateMessageDto {
  @IsNotEmpty({ message: 'Conversation ID is required' })
  @IsUUID('4', { message: 'Conversation ID must be a valid UUID' })
  conversationId: string;

  @IsNotEmpty({ message: 'Content is required' })
  @IsString({ message: 'Content must be a string' })
  @MaxLength(5000, { message: 'Content must not exceed 5000 characters' })
  content: string;

  @IsEnum(MessageSender, { message: 'Sender must be either user or bot' })
  sender: MessageSender;
}
