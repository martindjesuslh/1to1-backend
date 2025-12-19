import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';

import { User } from './user.entity';
import { Message } from './message.entity';

export interface ConversationMetadata {
  context?: string;
  customerName?: string;
  interests: string[];
  offeredProducts: string[];
  rejectedProducts: string[];
  saleStatus: 'exploring' | 'interested' | 'negotiating' | 'closed' | 'lost';
  lastIntent?: string;
}
@Entity('conversations')
@Index(['userId', 'createdAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Message, message => message.conversation, {
    cascade: true,
  })
  messages: Message[];

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: ConversationMetadata;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({
    name: 'messages_since_context_update',
    type: 'smallint',
    default: 0,
  })
  messagesSinceContextUpdate: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  @Index()
  updatedAt: Date;
}
