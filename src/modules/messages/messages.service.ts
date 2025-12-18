import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Message, MessageSender } from '@database/entities/message.entity';
import { Conversation } from '@database/entities/conversation.entity';
import { CreateMessageDto } from './dto/create-message.dto';

type MessageHistoryResponse = {
  conversationId: string;
  messages: Message[];
  totalMessages: number;
};

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly _messageRepository: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly _conversationRepository: Repository<Conversation>,
  ) {}

  async create(payload: CreateMessageDto): Promise<Message> {
    const conversation = this._conversationRepository.findOne({ where: { id: payload.conversationId } });

    if (!conversation) throw new NotFoundException(`Conversation with ID ${payload.conversationId} not found`);

    const message = this._messageRepository.create(payload);
    return await this._messageRepository.save(message);
  }

  async findByConversation(conversationId: string): Promise<Message[]> {
    const conversation = await this._conversationRepository.findOne({ where: { id: conversationId } });

    if (!conversation) throw new NotFoundException(`Conversation with ID ${conversationId} not found`);

    return await this._messageRepository.find({ where: { conversationId }, order: { createdAt: 'ASC' } });
  }

  async createUserMessage(conversationId: string, content: string): Promise<Message> {
    return this._messageRepository.create({ conversationId, content, sender: MessageSender.USER });
  }

  async createBotMessage(conversationId: string, content: string): Promise<Message> {
    return this._messageRepository.create({ conversationId, content, sender: MessageSender.BOT });
  }

  async getConversationHistory(conversationId: string): Promise<MessageHistoryResponse> {
    const messages = await this.findByConversation(conversationId);

    return { conversationId, messages, totalMessages: messages.length };
  }
}
