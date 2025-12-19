import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { Conversation } from '@database/entities/conversation.entity';
import { Message } from '@database/entities/message.entity';

import { OpenAIModule } from '@modules/openai/openia.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), OpenAIModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
