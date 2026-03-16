/**
 * MCP Tool Discovery Service — lists available MCP tools for autocomplete.
 */

export interface MCPTool {
  name: string
  description: string
  server: string
  inputSchema: Record<string, unknown>
}

/**
 * MCPService — discover available tools.
 *
 * Tool invocation happens server-side via the chat engine / agent loop.
 * This client service is only used for tool discovery (autocomplete, schema display).
 */
export const MCPService = {
  /**
   * List all available MCP tools for the current user.
   * Tools are cached server-side per user with 24h TTL.
   */
  async listTools(): Promise<MCPTool[]> {
    const res = await fetch('/api/mcp/tools')
    if (!res.ok) {
      throw new Error(`Failed to list MCP tools (${res.status})`)
    }
    const data = (await res.json()) as any
    return data.tools ?? []
  },

  /**
   * Get detailed schema for a specific tool.
   */
  async getToolSchema(toolName: string): Promise<MCPTool | null> {
    const res = await fetch(`/api/mcp/tools/${encodeURIComponent(toolName)}`)
    if (!res.ok) return null
    return res.json()
  },
}
