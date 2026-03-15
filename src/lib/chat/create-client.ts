/**
 * Anthropic Client Factory
 *
 * Creates an Anthropic SDK client from the ANTHROPIC_API_KEY environment variable.
 * Compatible with Cloudflare Workers edge runtime.
 */

import Anthropic from '@anthropic-ai/sdk'

/**
 * Create an Anthropic client instance.
 *
 * @param apiKey - The Anthropic API key. If not provided, reads from
 *   the ANTHROPIC_API_KEY env var (Node) or throws.
 */
export function createAnthropicClient(apiKey?: string): Anthropic {
  const key = apiKey ?? (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined)

  if (!key) {
    throw new Error(
      'Anthropic API key not configured. Pass apiKey or set ANTHROPIC_API_KEY.',
    )
  }

  return new Anthropic({ apiKey: key })
}
