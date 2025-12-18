import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';

import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly _conversationsService: ConversationsService) {}

  @Post()
  async create(@Request() req, @Body() payload: CreateConversationDto) {
    const userId = req.user.id;
    return await this._conversationsService.create(userId, payload);
  }

  @Get()
  async findAll(@Request() req) {
    const userId = req.user.id;
    return await this._conversationsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return await this._conversationsService.findOne(id, userId);
  }

  @Get(':id/messages')
  async getWithMessages(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return await this._conversationsService.getConversationWithMessages(id, userId);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateConversationDto: CreateConversationDto) {
    const userId = req.user.id;
    return await this._conversationsService.update(id, userId, updateConversationDto);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    await this._conversationsService.remove(id, userId);
    return { message: 'Conversation deleted successfully' };
  }
}
