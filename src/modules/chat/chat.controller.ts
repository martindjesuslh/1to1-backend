import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';

import { ChatService } from './chat.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  async sendMessage(@Request() req, @Body() sendChatMessageDto: SendChatMessageDto) {
    const userId = req.user.id;
    return await this.chatService.sendMessage(userId, sendChatMessageDto);
  }

  @Get('conversations')
  async getConversations(@Request() req) {
    const userId = req.user.id;
    return await this.chatService.getConversations(userId);
  }

  @Get('history/:conversationId')
  async getHistory(@Request() req, @Param('conversationId') conversationId: string) {
    const userId = req.user.id;
    return await this.chatService.getConversationHistory(conversationId, userId);
  }

  @Patch('conversations/:conversationId/title')
  async updateTitle(@Request() req, @Param('conversationId') conversationId: string, @Body('title') title: string) {
    const userId = req.user.id;
    return await this.chatService.updateConversationTitle(conversationId, userId, title);
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(@Request() req, @Param('conversationId') conversationId: string) {
    const userId = req.user.id;
    await this.chatService.deleteConversation(conversationId, userId);
    return { message: 'Conversation deleted successfully' };
  }
}
