/**
 * Chat Engine
 *
 * Lightweight, provider-agnostic chat orchestration engine.
 * Accepts an IAIProvider and coordinates message processing with streaming.
 *
 * This is intentionally minimal for the initial integration -- tool use,
 * storage, and MCP support can be layered on later.
 */

import type { IAIProvider, ChatMessage, StreamEvent } from './types'

/** Parameters for processMessage */
export interface ProcessMessageParams {
  /** Full conversation history (including the new user message) */
  messages: ChatMessage[]
  /** System prompt to send to the model */
  systemPrompt: string
  /** Callback invoked for each stream event */
  onEvent: (event: StreamEvent) => void
  /** Optional abort signal for cancellation */
  signal?: AbortSignal
}

export class ChatEngine {
  private provider: IAIProvider

  constructor(provider: IAIProvider) {
    this.provider = provider
  }

  /**
   * Process a conversation through the AI provider and yield stream events
   * via the onEvent callback.
   *
   * The caller is responsible for:
   * - Building the message history (including the latest user message)
   * - Persisting messages before/after this call
   * - Constructing the system prompt
   */
  async processMessage(params: ProcessMessageParams): Promise<void> {
    const { messages, systemPrompt, onEvent, signal } = params

    await this.provider.streamChat({
      messages,
      systemPrompt,
      onMessage: onEvent,
      signal,
    })
  }
}
