import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { Message } from '@database/entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly _messagesService: MessagesService) {}

  @Post()
  async create(@Body() payload: CreateMessageDto) {
    return await this._messagesService.create(payload);
  }

  @Get('conversation/:conversationId')
  async findByConversation(@Param('conversationId') conversationId: string) {
    return await this._messagesService.getConversationHistory(conversationId);
  }
}
