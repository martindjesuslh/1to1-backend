import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Conversation, ConversationMetadata } from '@database/entities/conversation.entity';
import { Message, MessageSender } from '@database/entities/message.entity';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { OpenAIService } from '@modules/openai/openia.service';

@Injectable()
export class ChatService {
  private readonly CONTEXT_UPDATE_THRESHOLD = 6;

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly dataSource: DataSource,
    private openAIService: OpenAIService,
  ) {}

  async sendMessage(userId: string, sendChatMessageDto: SendChatMessageDto) {
    const { conversationId, content } = sendChatMessageDto;

    if (conversationId) {
      return await this.addMessageToExistingConversation(conversationId, userId, content);
    }

    return await this.createConversationWithFirstMessage(userId, content);
  }

  async getConversations(userId: string) {
    return await this.conversationRepository.find({
      where: { userId },
      select: ['id', 'title', 'createdAt', 'updatedAt'],
      order: { updatedAt: 'DESC' },
    });
  }

  async getConversationHistory(conversationId: string, userId: string) {
    const conversation = await this.findConversationByIdAndUser(conversationId, userId);

    const messages = await this.messageRepository.find({
      where: { conversationId },
      select: ['id', 'content', 'sender', 'createdAt'],
      order: { createdAt: 'ASC' },
    });

    return {
      conversationId: conversation.id,
      title: conversation.title,
      messages,
      totalMessages: messages.length,
    };
  }

  async updateConversationTitle(conversationId: string, userId: string, title: string) {
    const conversation = await this.findConversationByIdAndUser(conversationId, userId);
    conversation.title = title;
    return await this.conversationRepository.save(conversation);
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.findConversationByIdAndUser(conversationId, userId);
    await this.conversationRepository.remove(conversation);
  }

  private async findConversationByIdAndUser(conversationId: string, userId: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
    }

    return conversation;
  }

  private async addMessageToExistingConversation(conversationId: string, userId: string, content: string) {
    const conversation = await this.findConversationByIdAndUser(conversationId, userId);

    const userMessage = await this.createUserMessage(conversationId, content);
    const botMessage = await this.createBotMessage(conversationId, content, conversation.metadata);

    await this.handleMetadataUpdate(conversation, conversationId);

    return this.formatResponse(conversation, userMessage, botMessage);
  }

  private async createConversationWithFirstMessage(userId: string, content: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const title = await this.openAIService.generateConversationTitle(content);
      const conversation = await this.createNewConversation(queryRunner, userId, title);
      const userMessage = await this.saveUserMessage(queryRunner, conversation.id, content);
      const botMessage = await this.saveBotMessage(queryRunner, conversation.id, content, null);

      await queryRunner.commitTransaction();

      return this.formatResponse(conversation, userMessage, botMessage);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createNewConversation(queryRunner: any, userId: string, title: string): Promise<Conversation> {
    const metadata: ConversationMetadata = {
      interests: [],
      offeredProducts: [],
      rejectedProducts: [],
      saleStatus: 'exploring',
    };

    const conversation = queryRunner.manager.create(Conversation, {
      userId,
      title,
      metadata,
      messagesSinceContextUpdate: 2,
    });

    return await queryRunner.manager.save(conversation);
  }

  private async createUserMessage(conversationId: string, content: string): Promise<Message> {
    return await this.messageRepository.save({
      conversationId,
      content,
      sender: MessageSender.USER,
    });
  }

  private async createBotMessage(
    conversationId: string,
    userMessage: string,
    metadata: ConversationMetadata | null,
  ): Promise<Message> {
    const botResponse = await this.openAIService.generateSalesResponse(userMessage, metadata ?? undefined);
    return await this.messageRepository.save({
      conversationId,
      content: botResponse,
      sender: MessageSender.BOT,
    });
  }

  private async saveUserMessage(queryRunner: any, conversationId: string, content: string): Promise<Message> {
    const userMessage = queryRunner.manager.create(Message, {
      conversationId,
      content,
      sender: MessageSender.USER,
    });
    return await queryRunner.manager.save(userMessage);
  }

  private async saveBotMessage(
    queryRunner: any,
    conversationId: string,
    userMessage: string,
    metadata: ConversationMetadata | null,
  ): Promise<Message> {
    const botResponse = await this.openAIService.generateSalesResponse(userMessage, metadata ?? undefined);
    const botMessage = queryRunner.manager.create(Message, {
      conversationId,
      content: botResponse,
      sender: MessageSender.BOT,
    });
    return await queryRunner.manager.save(botMessage);
  }

  private async handleMetadataUpdate(conversation: Conversation, conversationId: string): Promise<void> {
    const newCounter = conversation.messagesSinceContextUpdate + 2;

    if (newCounter >= this.CONTEXT_UPDATE_THRESHOLD) {
      await this.updateConversationMetadata(conversation, conversationId);
      conversation.messagesSinceContextUpdate = 0;
    } else {
      conversation.messagesSinceContextUpdate = newCounter;
    }

    await this.conversationRepository.save(conversation);
  }

  private async updateConversationMetadata(conversation: Conversation, conversationId: string): Promise<void> {
    const shouldGenerateInitialMetadata = this.isInitialMetadataGeneration(conversation);

    if (shouldGenerateInitialMetadata) {
      await this.generateInitialMetadata(conversation, conversationId);
    } else {
      await this.updateExistingMetadata(conversation, conversationId);
    }
  }

  private isInitialMetadataGeneration(conversation: Conversation): boolean {
    const hasEmptyMetadata =
      conversation.metadata.interests.length === 0 &&
      conversation.metadata.offeredProducts.length === 0 &&
      !conversation.metadata.lastIntent;

    return hasEmptyMetadata;
  }

  private async generateInitialMetadata(conversation: Conversation, conversationId: string): Promise<void> {
    const messages = await this.getMessagesForAnalysis(conversationId, 6);
    const conversationHistory = this.formatMessagesForAnalysis(messages);
    const metadata = await this.openAIService.generateInitialMetadata(conversationHistory);
    conversation.metadata = metadata;
  }

  private async updateExistingMetadata(conversation: Conversation, conversationId: string): Promise<void> {
    const messages = await this.getMessagesForAnalysis(conversationId, 4);
    const recentMessages = this.formatMessagesForAnalysis(messages);
    const updatedMetadata = await this.openAIService.updateMetadata(recentMessages, conversation.metadata);
    conversation.metadata = updatedMetadata;
  }

  private async getMessagesForAnalysis(conversationId: string, limit: number): Promise<Message[]> {
    return await this.messageRepository.find({
      where: { conversationId },
      select: ['content', 'sender'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private formatMessagesForAnalysis(messages: Message[]): string {
    return messages
      .reverse()
      .map(msg => `${msg.sender === MessageSender.USER ? 'Cliente' : 'Vendedor'}: ${msg.content}`)
      .join('\n');
  }

  private formatResponse(conversation: Conversation, userMessage: Message, botMessage: Message) {
    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
      },
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        sender: userMessage.sender,
        createdAt: userMessage.createdAt,
      },
      botMessage: {
        id: botMessage.id,
        content: botMessage.content,
        sender: botMessage.sender,
        createdAt: botMessage.createdAt,
      },
    };
  }
}
