/**
 * Prompt Builder — Memory-Augmented System Prompts
 *
 * Composes system prompts for ghost personas with memory context
 * injected as XML blocks. Trust tiers control which memory scopes
 * are searched for relevant context.
 *
 * Called by the ghost streaming endpoint (Task 29) before invoking ChatEngine.
 */

import type { GhostPersona } from '@/services/ghost.service'

/**
 * A memory record as returned by the remember-core SvcClient search.
 * Only the fields needed for prompt injection are typed here.
 */
export interface MemoryRecord {
  id: string
  title: string
  content: string
  scope?: string
  created_at?: string
  updated_at?: string
}

export type TrustTier = GhostPersona['trustTier']

/**
 * Scopes available for memory search, ordered from most open to most restricted.
 */
const SCOPE_TIERS: Record<TrustTier, string[]> = {
  public: ['public', 'spaces'],
  friends: ['public', 'spaces', 'friends'],
  'inner-circle': ['public', 'spaces', 'friends', 'groups'],
  private: ['public', 'spaces', 'friends', 'groups', 'personal'],
}

/**
 * Returns the array of memory scopes a ghost is allowed to search,
 * based on its trust tier.
 */
export function getTrustTierScopes(trustTier: TrustTier): string[] {
  return SCOPE_TIERS[trustTier] ?? SCOPE_TIERS.public
}

/**
 * Format an array of memory records into an XML block suitable
 * for injection into a system prompt.
 *
 * Returns an empty string when there are no memories to avoid
 * adding noise to the prompt.
 */
export function formatMemoryContext(memories: MemoryRecord[]): string {
  if (!memories || memories.length === 0) {
    return ''
  }

  const memoryBlocks = memories.map((m) => {
    const attrs: string[] = []
    if (m.title) attrs.push(`title="${escapeXmlAttr(m.title)}"`)
    if (m.created_at) attrs.push(`created="${m.created_at}"`)
    if (m.scope) attrs.push(`scope="${escapeXmlAttr(m.scope)}"`)

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
    return `<memory${attrStr}>\n${m.content}\n</memory>`
  })

  return `<memories>\n${memoryBlocks.join('\n')}\n</memories>`
}

export interface BuildGhostSystemPromptParams {
  ghostPersona: GhostPersona
  memoryContext: MemoryRecord[]
}

/**
 * Build a complete system prompt for a ghost persona conversation.
 *
 * Structure:
 * 1. Ghost identity and behavior (from ghostPersona.systemPromptFragment)
 * 2. Trust-tier disclosure
 * 3. Memory context XML block (if any memories were found)
 * 4. Interaction guidelines
 */
export function buildGhostSystemPrompt(params: BuildGhostSystemPromptParams): string {
  const { ghostPersona, memoryContext } = params

  const sections: string[] = []

  // 1. Ghost identity
  sections.push(
    `You are ${ghostPersona.name}. ${ghostPersona.description}`,
  )

  // 2. System prompt fragment (custom persona instructions)
  if (ghostPersona.systemPromptFragment) {
    sections.push(ghostPersona.systemPromptFragment)
  }

  // 3. Trust-tier context
  const scopes = getTrustTierScopes(ghostPersona.trustTier)
  sections.push(
    `Your trust tier is "${ghostPersona.trustTier}". You have access to memories in these scopes: ${scopes.join(', ')}.`,
  )

  // 4. Memory context
  const memoryXml = formatMemoryContext(memoryContext)
  if (memoryXml) {
    sections.push(
      `The following memories have been retrieved as context for this conversation. Reference them naturally when relevant — do not list them verbatim unless asked.\n\n${memoryXml}`,
    )
  }

  // 5. Interaction guidelines
  sections.push(
    [
      'Guidelines:',
      '- Stay in character at all times.',
      '- Reference memories naturally when they are relevant to the conversation.',
      '- Do not fabricate memories or claim to remember things not provided in the context above.',
      '- If the user asks about something outside your memory context, say so honestly.',
    ].join('\n'),
  )

  return sections.join('\n\n')
}

/**
 * Escape a string for safe use in an XML attribute value.
 */
function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
