import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index, JoinColumn } from 'typeorm';

import { Conversation } from './conversation.entity';

export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  @Index()
  conversationId: string;

  @ManyToOne(() => Conversation, conversation => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({
    type: 'enum',
    enum: MessageSender,
    default: MessageSender.USER,
  })
  @Index()
  sender: MessageSender;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'create_at', type: 'timestamp' })
  createdAt: Date;
}
