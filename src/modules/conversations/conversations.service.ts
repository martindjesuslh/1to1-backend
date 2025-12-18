import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Conversation } from '@database/entities/conversation.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly _conversationRepository: Repository<Conversation>,
  ) {}

  async create(userId: string, payload: CreateConversationDto): Promise<Conversation> {
    const conversation = this._conversationRepository.create({
      ...payload,
      userId,
      title: payload.title || 'New Conversation',
    });

    return await this._conversationRepository.save(conversation);
  }

  async findAll(userId: string): Promise<Conversation[]> {
    return await this._conversationRepository.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string, userId: string): Promise<Conversation> {
    const conversation = await this._conversationRepository.findOne({ where: { id, userId }, relations: ['messages'] });

    if (!conversation) throw new NotFoundException(`Conversation with ID ${id} not found`);

    if (conversation.userId !== userId) throw new ForbiddenException('You do not have access to this conversation');

    return conversation;
  }

  async update(id: string, userId: string, updateData: Partial<CreateConversationDto>): Promise<Conversation> {
    const conversation = await this.findOne(id, userId);

    Object.assign(conversation, updateData);

    return await this._conversationRepository.save(conversation);
  }

  async remove(id: string, userId: string): Promise<void> {
    const conversation = await this.findOne(id, userId);
    await this._conversationRepository.remove(conversation);
  }

  async getConversationWithMessages(id: string, userId: string): Promise<Conversation> {
    const conversation = await this._conversationRepository.findOne({
      where: { id, userId },
      relations: ['messages'],
    });

    if (!conversation) throw new NotFoundException(`Conversation with ID ${id} not found`);

    if (conversation.userId !== userId) throw new ForbiddenException('You do not have access to this conversation');

    return conversation;
  }
}
