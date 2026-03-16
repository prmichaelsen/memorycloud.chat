/**
 * Agent Mention Detection
 *
 * Detects @agent mentions in messages and determines whether
 * the AI agent should respond based on conversation type.
 * Ported from agentbase.me.
 */

import type { MessageContent } from '@/types/conversations'

/**
 * Detect @agent mention in message content (case-insensitive).
 */
export function detectAgentMention(content: MessageContent): boolean {
  const text = extractTextFromMessage(content)
  return /@agent\b/i.test(text)
}

/**
 * Extract plain text from a message (string or ContentBlock[]).
 */
export function extractTextFromMessage(content: MessageContent): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''

  return content
    .filter((block) => block.type === 'text' && 'text' in block)
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join(' ')
}

/**
 * Determine whether the agent should respond to a message.
 * - 'chat' (solo AI): always respond
 * - 'dm' / 'group': only respond if @agent is mentioned
 */
export function shouldAgentRespond(
  conversationType: 'chat' | 'dm' | 'group',
  hasAgentMention: boolean,
): boolean {
  if (conversationType === 'chat') return true
  return hasAgentMention
}
