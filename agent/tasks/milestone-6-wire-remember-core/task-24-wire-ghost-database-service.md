# Task 24: Wire GhostDatabaseService to SvcClient

**Milestone**: [M6 - Wire remember-core](../../milestones/milestone-6-wire-remember-core.md)
**Design Reference**: [Requirements](../../design/local.requirements.md)
**Estimated Time**: 2-3 hours
**Dependencies**: Task 22 (SvcClient configured)
**Status**: Not Started

---

## Objective

Wire GhostDatabaseService to use SvcClient for ghost conversations with trust-tier filtered memory access, and create `/api/ghost/*` API routes.

---

## Steps

### 1. Update GhostDatabaseService
Replace stubs in `src/services/ghost-database.service.ts`:

- `listGhosts(userId)` — query ghost configurations from shared Firestore (same as agentbase.me's GhostConfigService pattern)
- `getOrCreateConversation(userId, ghostId)` — read/create ghost conversation doc in Firestore
- `sendMessage(conversationId, message)` — persist message, then query memories via `svc.memories.search(userId, { query: message.content, ... })` with GhostSearchContext for trust filtering
- `listConversations(userId)` — list ghost conversation docs

### 2. Wire Spaces Feed (bonus)
- `svc.spaces.search(userId, { spaces: ['the_void'], query, limit })` for public space browsing
- Can be used in memories tab scope filter when scope='spaces'

### 3. Create API Routes

- `src/routes/api/ghost/list.tsx` — GET, list available ghosts
- `src/routes/api/ghost/conversation.tsx` — GET/POST, get or create ghost conversation
- `src/routes/api/ghost/send.tsx` — POST, send message to ghost (triggers memory search + AI response)

Each route: auth check, call GhostDatabaseService, return JSON.

### 4. Update Client Service
Verify `src/services/ghost.service.ts` endpoints match the new API routes.

---

## Verification

- [ ] Ghost list loads from shared Firestore config
- [ ] Ghost conversations persist across sessions
- [ ] Ghost memory queries use trust-tier filtering
- [ ] `/api/ghost/list` returns available ghosts
- [ ] `/api/ghost/send` triggers memory-augmented response
- [ ] All routes check auth before proceeding
