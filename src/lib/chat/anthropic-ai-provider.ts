/**
 * Anthropic AI Provider
 *
 * Implements IAIProvider using the official @anthropic-ai/sdk.
 * Streams responses from Claude and emits StreamEvents.
 *
 * Compatible with Cloudflare Workers (edge runtime).
 */

import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { createAnthropicClient } from './create-client'
import type { IAIProvider, StreamChatParams, ChatMessage, StreamEvent } from './types'

const MODEL_ID = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096
const TEMPERATURE = 0

export class AnthropicAIProvider implements IAIProvider {
  private client: Anthropic | null = null
  private apiKey: string | undefined

  constructor(apiKey?: string) {
    this.apiKey = apiKey
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = createAnthropicClient(this.apiKey)
    }
    return this.client
  }

  async streamChat(params: StreamChatParams): Promise<void> {
    const { messages, systemPrompt, onMessage, signal } = params

    try {
      const client = this.getClient()

      // Convert ChatMessage[] to Anthropic MessageParam[]
      const anthropicMessages: MessageParam[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Track usage from stream events
      let inputTokens = 0
      let outputTokens = 0

      const stream = await client.messages.stream(
        {
          model: MODEL_ID,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: systemPrompt,
          messages: anthropicMessages,
        },
        signal ? { signal } : undefined,
      )

      for await (const event of stream) {
        // Capture usage from message_start
        if (
          event.type === 'message_start' &&
          (event as any).message?.usage
        ) {
          inputTokens += (event as any).message.usage.input_tokens ?? 0
        }

        // Capture usage from message_delta
        if (event.type === 'message_delta' && (event as any).usage) {
          outputTokens += (event as any).usage.output_tokens ?? 0
        }

        // Text content chunks
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          onMessage({ type: 'chunk', content: event.delta.text })
        }
      }

      // Emit usage before complete
      if (inputTokens > 0 || outputTokens > 0) {
        onMessage({ type: 'usage', input_tokens: inputTokens, output_tokens: outputTokens })
      }

      onMessage({ type: 'complete' })
    } catch (error) {
      // Abort is expected when user cancels -- not an error
      if (error instanceof Error && error.name === 'AbortError') {
        onMessage({ type: 'complete' })
        return
      }

      onMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
