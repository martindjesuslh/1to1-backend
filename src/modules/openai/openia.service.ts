import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) throw new Error('OPENAI_API_KEY is not defined');

    this.openai = new OpenAI({
      apiKey,
    });
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

      if (!title) {
        return 'Nueva conversación';
      }

      return title;
    } catch (error) {
      this.logger.error('Error generating conversation title:', error);
      return 'Nueva conversación';
    }
  }

  async generateSalesResponse(context: string, userMessage: string): Promise<string> {
    try {
      const systemPrompt = `Eres un asistente de ventas profesional y amigable. Tu objetivo es:
- Ayudar al cliente a encontrar el producto perfecto para sus necesidades
- Hacer preguntas relevantes sobre sus preferencias y requisitos
- Proporcionar información clara y útil sobre productos
- Mantener un tono conversacional y profesional
- Guiar la conversación hacia el cierre de la venta de manera natural

Contexto de la conversación:
${context}`;

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

      if (!response) {
        throw new Error('No response generated from OpenAI');
      }

      return response;
    } catch (error) {
      this.logger.error('Error generating OpenAI response:', error);
      throw error;
    }
  }

  async analyzeConversationContext(messages: string[]): Promise<string> {
    try {
      const conversationHistory = messages.join('\n');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analiza la siguiente conversación de ventas y genera un resumen conciso que capture:
- Intereses principales del cliente
- Productos mencionados
- Preferencias y requisitos específicos
- Estado actual de la conversación (exploración, consideración, cierre)
- Próximos pasos sugeridos

Mantén el resumen claro y enfocado (máximo 200 palabras).`,
          },
          {
            role: 'user',
            content: conversationHistory,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      });

      const context = completion.choices[0]?.message?.content;

      if (!context) {
        throw new Error('No context generated from OpenAI');
      }

      return context;
    } catch (error) {
      this.logger.error('Error analyzing conversation context:', error);
      throw error;
    }
  }
}
