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
            content: `Genera un título corto para una conversación de ventas.
REGLAS:
- Máximo 6 palabras.
- Sin signos de exclamación ni interrogación.
- No usar saludos ni frases genéricas.
- Prioriza intención de compra o producto.
- Usa el idioma del mensaje del usuario.
- Responde únicamente con el título, sin texto adicional.`,
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
            content: `Analiza esta conversación de ventas y extrae metadata estructurada.
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, con esta estructura exacta:
{
  "interests": ["intereses claros y cortos"],
  "offeredProducts": ["productos mencionados u ofrecidos"],
  "rejectedProducts": ["productos rechazados"],
  "saleStatus": "exploring|interested|negotiating|closed|lost",
  "lastIntent": "intención más reciente del cliente"
}
REGLAS:
- Usa minúsculas.
- Elimina duplicados.
- interests: solo intereses explícitos o claramente inferidos.
- offeredProducts: solo productos realmente mencionados.
- rejectedProducts: solo si el cliente rechaza explícitamente.
- saleStatus:
  * pregunta general → exploring
  * pregunta por precio o características → interested
  * negociación o cotización → negotiating
  * confirmación de compra → closed
  * rechazo claro → lost
- lastIntent: máximo 6 palabras, intención clara y actual.`,
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
RESPONDE ÚNICAMENTE con un objeto JSON válido actualizado, sin texto adicional, con esta estructura exacta:
{
  "interests": ["array actualizado de intereses"],
  "offeredProducts": ["productos ofrecidos actualizados"],
  "rejectedProducts": ["productos rechazados actualizados"],
  "saleStatus": "exploring|interested|negotiating|closed|lost",
  "lastIntent": "última intención detectada"
}

REGLAS DE ACTUALIZACIÓN (OBLIGATORIAS):
- Normaliza todo a minúsculas y elimina duplicados.
- interests: agrega solo tags cortos detectados en recentMessages; no borres intereses salvo rechazo explícito.
- offeredProducts: agrega productos que el agente o el usuario hayan mencionado como opción (si ya estaban, no los dupliques).
- rejectedProducts: si el usuario dice "no", "no quiero", "me interesa otra cosa", agrega el producto a rejectedProducts y quítalo de offeredProducts.
- saleStatus: avanza siempre hacia el estado más avanzado detectado (closed > negotiating > interested > exploring). No retroceder.
  * Si hay palabras tipo "precio", "¿cuánto cuesta?" → al menos "interested".
  * Si pide cotización, descuento o condiciones de pago → "negotiating".
  * Si confirma compra ("lo compro", "sí, acepto") → "closed".
  * Si dice "no me interesa" repetidamente → "lost".
- lastIntent: debe ser la intención MÁS RECIENTE y concisa (máx. 6 palabras).
- Responde únicamente el JSON (sin comillas de más, sin code fences, sin texto extra).
`,
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
    const basePrompt = `Eres un asesor de ventas digital orientado a conversión.
REGLAS OBLIGATORIAS:
- Respuestas claras, directas y comerciales.
- Máximo 5 líneas o 5 bullets.
- Prohibido explicaciones largas, teoría o definiciones.
- Prohibido hablar de tu rol, de ayudar o de ser asistente.
- No usar introducciones largas ni frases de relleno.
- No disculpas.
USO OBLIGATORIO DE CONTEXTO (METADATA):
- interests: prioriza lo que el cliente ya mostró interés.
- offeredProducts: NO repitas productos ya ofrecidos.
- rejectedProducts: NUNCA vuelvas a sugerirlos.
- saleStatus: define el tipo de respuesta.
- lastIntent: responde directamente a esa intención.
COMPORTAMIENTO SEGÚN saleStatus:
- exploring: hacer máximo 2 preguntas para acotar.
- interested: proponer 2–3 opciones concretas.
- negotiating: comparar opciones, precio o beneficios.
- closed: confirmar siguientes pasos, no seguir vendiendo.
- lost: ofrecer UNA última alternativa o cierre suave.
FORMATO:
- Bullets cortos (≤15 palabras).
- Información accionable, no descriptiva.
MODO TEXTO CORTO (OBLIGATORIO):
Si el usuario dice "mucho texto", "resume", "no se entiende", "algo claro":
- Máximo 3 bullets.
- Sin introducción.
- Solo decisión o filtro.
CIERRE OBLIGATORIO:
- Termina SIEMPRE con UNA pregunta concreta que obligue a elegir o confirmar.
`;

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
