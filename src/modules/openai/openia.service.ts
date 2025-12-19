import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import type { ConversationMetadata } from '@database/entities/conversation.entity';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) throw new Error('OPENAI_API_KEY is not defined');

    this.openai = new OpenAI({ apiKey });
  }

  async generateConversationTitle(firstMessage: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Genera un título corto y descriptivo (máximo 6 palabras) para una conversación de ventas basado en el primer mensaje del usuario. Solo responde con el título, sin comillas ni puntuación adicional.',
          },
          {
            role: 'user',
            content: firstMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 20,
      });

      const title = completion.choices[0]?.message?.content?.trim();

      if (!title) return 'Nueva conversación';

      return title;
    } catch (error) {
      this.logger.error('Error generating conversation title:', error);
      return 'Nueva conversación';
    }
  }

  async generateSalesResponse(userMessage: string, metadata?: ConversationMetadata): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(metadata);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) throw new Error('No response generated from OpenAI');

      return response;
    } catch (error) {
      this.logger.error('Error generating OpenAI response:', error);
      throw error;
    }
  }

  async generateInitialMetadata(conversationHistory: string): Promise<ConversationMetadata> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analiza esta conversación de ventas y extrae la información estructurada en formato JSON.
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con esta estructura:
{
  "interests": ["array de intereses del cliente"],
  "offeredProducts": ["productos mencionados u ofrecidos"],
  "rejectedProducts": ["productos rechazados"],
  "saleStatus": "exploring|interested|negotiating|closed|lost",
  "lastIntent": "última intención detectada del cliente"
}`,
          },
          {
            role: 'user',
            content: conversationHistory,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) throw new Error('No metadata generated from OpenAI');

      return this.parseMetadataResponse(content);
    } catch (error) {
      this.logger.error('Error generating initial metadata:', error);
      throw error;
    }
  }

  async updateMetadata(recentMessages: string, currentMetadata: ConversationMetadata): Promise<ConversationMetadata> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Actualiza la metadata de esta conversación basándote en los mensajes recientes.
Metadata actual:
${JSON.stringify(currentMetadata, null, 2)}

Responde ÚNICAMENTE con un objeto JSON válido actualizado, sin texto adicional, con esta estructura:
{
  "interests": ["array actualizado de intereses"],
  "offeredProducts": ["productos ofrecidos actualizados"],
  "rejectedProducts": ["productos rechazados actualizados"],
  "saleStatus": "exploring|interested|negotiating|closed|lost",
  "lastIntent": "última intención detectada"
}`,
          },
          {
            role: 'user',
            content: recentMessages,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('No updated metadata generated from OpenAI');
      }

      return this.parseMetadataResponse(content);
    } catch (error) {
      this.logger.error('Error updating metadata:', error);
      throw error;
    }
  }

  private buildSystemPrompt(metadata?: ConversationMetadata): string {
    const basePrompt = `Eres un asistente de ventas profesional y amigable. Tu objetivo es:
- Ayudar al cliente a encontrar el producto perfecto para sus necesidades
- Hacer preguntas relevantes sobre sus preferencias y requisitos
- Proporcionar información clara y útil sobre productos
- Mantener un tono conversacional y profesional
- Guiar la conversación hacia el cierre de la venta de manera natural`;

    if (!metadata) {
      return basePrompt;
    }

    const contextInfo = this.formatMetadataForPrompt(metadata);
    return `${basePrompt}

Contexto de la conversación:
${contextInfo}`;
  }

  private formatMetadataForPrompt(metadata: ConversationMetadata): string {
    const parts: string[] = [];

    if (metadata.interests?.length > 0) parts.push(`Intereses del cliente: ${metadata.interests.join(', ')}`);

    if (metadata.offeredProducts?.length > 0) parts.push(`Productos ofrecidos: ${metadata.offeredProducts.join(', ')}`);

    if (metadata.rejectedProducts?.length > 0)
      parts.push(`Productos rechazados: ${metadata.rejectedProducts.join(', ')}`);

    parts.push(`Estado de la venta: ${metadata.saleStatus}`);

    if (metadata.lastIntent) parts.push(`Última intención: ${metadata.lastIntent}`);

    return parts.join('\n');
  }

  private parseMetadataResponse(content: string): ConversationMetadata {
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanedContent);

      return {
        interests: parsed.interests || [],
        offeredProducts: parsed.offeredProducts || [],
        rejectedProducts: parsed.rejectedProducts || [],
        saleStatus: parsed.saleStatus || 'exploring',
        lastIntent: parsed.lastIntent,
      };
    } catch (error) {
      this.logger.error('Error parsing metadata response:', error);
      throw new Error('Failed to parse metadata from OpenAI response');
    }
  }
}
