# Task 34: Wire MCP Provider into ChatEngine

**Milestone**: [M10 - Groups & MCP API](../../milestones/milestone-10-groups-mcp-api.md)
**Design Reference**: [Requirements](../../design/local.requirements.md)
**Estimated Time**: 3-4 hours
**Dependencies**: Task 28 (ChatEngine exists)
**Status**: Not Started

---

## Objective

Port agentbase.me's MCP provider pattern into remember-enterprise so that `@agent` commands in chat invoke real MCP tools via the `@modelcontextprotocol/sdk`. Tools are discovered from shared Firestore MCP server registry and executed through the ChatEngine — not through custom REST API routes.

---

## Context

agentbase.me's MCP system uses:
- `IMCPProvider` interface with 5 methods: getAvailableServers, connectToServers, getTools, executeTool, disconnect
- `MCPProvider` concrete class with caching, JWT tokens, parallel connections
- `mcp-client.ts` low-level SDK calls (discoverMCPServer, connectToMCPServer, executeMCPTool)
- `mcp-jwt.ts` for JWT token generation
- Shared Firestore `mcp-servers` collection for server registry
- `@modelcontextprotocol/sdk` for transport and tool execution

Key files to reference in agentbase.me:
- `src/lib/chat/interfaces/mcp-provider.ts` — IMCPProvider interface
- `src/lib/chat-providers/mcp-provider.ts` — MCPProvider implementation
- `src/lib/chat/mcp-client.ts` — low-level SDK operations
- `src/lib/auth/mcp-jwt.ts` — JWT generation
- `src/services/mcp-server-database.service.ts` — Firestore server registry
- `src/schemas/mcp-integration.ts` — MCPServer schema

---

## Steps

### 1. Install MCP SDK dependencies
- `npm install @modelcontextprotocol/sdk @prmichaelsen/mcp-auth`
- Verify edge-runtime compatibility with Cloudflare Workers

### 2. Port IMCPProvider interface
- File: `src/lib/chat/interfaces/mcp-provider.ts`
- Port from agentbase.me — same interface (getAvailableServers, connectToServers, getTools, executeTool, disconnect)
- Port associated types: MCPServer, MCPConnection, Tool, ExecuteToolParams

### 3. Port mcp-client.ts
- File: `src/lib/chat/mcp-client.ts`
- Port discoverMCPServer, connectToMCPServer, getToolsFromMCPServers, executeMCPTool, disconnectFromMCPServers
- Uses `@modelcontextprotocol/sdk` SSE/HTTP transports with Bearer token auth

### 4. Port mcp-jwt.ts
- File: `src/lib/chat/mcp-jwt.ts`
- Port generateMCPToken() — creates JWT with `{ userId, iss: 'remember-enterprise', aud: 'mcp-server' }`
- Use `jsonwebtoken` or `@prmichaelsen/mcp-auth` for signing

### 5. Port MCPProvider (simplified)
- File: `src/lib/chat/mcp-provider.ts`
- Port from agentbase.me but simplified:
  - Skip OAuth-dependent servers initially (only support `type: 'static'` servers)
  - Keep caching (global server cache, per-instance tool cache)
  - Keep JWT token generation and proactive refresh
  - Keep toolToConnectionMap for routing execution to correct server
- Query shared Firestore `mcp-servers` collection (same as agentbase.me — same database)

### 6. Wire MCPProvider into ChatEngine
- Update `ChatEngine` constructor to optionally accept `mcpProvider?: IMCPProvider`
- Update `processMessage()`:
  1. If mcpProvider exists: call getAvailableServers → connectToServers → getTools
  2. Pass MCP tools + any local tools to Anthropic as tool definitions
  3. On tool_use from Anthropic: route to mcpProvider.executeTool() or local tool handler
  4. Return tool results to Anthropic for continued generation
- Update `StreamEvent` type to include tool_call and tool_result events

### 7. Update ghost streaming endpoint
- In `$conversationId.messages.stream.tsx`:
  - Instantiate MCPProvider alongside AnthropicAIProvider
  - Pass to ChatEngine constructor
  - Tool results will be streamed as SSE events alongside text chunks

### 8. Delete custom MCP REST routes (if any exist)
- Remove any `/api/mcp/tools` or `/api/mcp/tools/$toolName/invoke` routes
- MCP tools flow through ChatEngine, not custom API endpoints

---

## Verification

- [ ] `@modelcontextprotocol/sdk` installed and builds
- [ ] IMCPProvider interface matches agentbase.me contract
- [ ] MCPProvider connects to static MCP servers from shared Firestore registry
- [ ] Tools discovered via `client.listTools()` from connected servers
- [ ] Tool execution via `client.callTool()` returns results
- [ ] ChatEngine passes MCP tools to Anthropic as tool definitions
- [ ] `@agent` command in ghost chat triggers tool execution via MCP
- [ ] Tool results render inline via AgentResult component
- [ ] No custom REST API routes for MCP tools
- [ ] Build passes

---

**Next Task**: None (M10 complete)
