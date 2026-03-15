# Task 23: Wire MemoryDatabaseService to SvcClient

**Milestone**: [M6 - Wire remember-core](../../milestones/milestone-6-wire-remember-core.md)
**Design Reference**: [Requirements](../../design/local.requirements.md)
**Estimated Time**: 3-4 hours
**Dependencies**: Task 22 (SvcClient configured)
**Status**: Not Started

---

## Objective

Replace MemoryDatabaseService stubs with real SvcClient calls and create the `/api/memories/*` API routes that proxy through the service.

---

## Steps

### 1. Update MemoryDatabaseService
Replace stubs in `src/services/memory-database.service.ts` with:

- `save(userId, params)` → `svc.memories.create(userId, { content, title, tags, ... })`
- `getFeed(userId, params)` → map algorithm to SDK sort method:
  - `smart` → `svc.memories.byRecommendation(userId, ...)`
  - `chronological` → `svc.memories.byTime(userId, ...)`
  - `discovery` → `svc.memories.byDiscovery(userId, ...)`
  - `rating` → `svc.memories.byRating(userId, ...)`
  - `significance` → `svc.memories.byDensity(userId, ...)`
- `getById(userId, memoryId)` → `svc.memories.get(userId, memoryId, {})`
- `update(userId, memoryId, updates)` → `svc.memories.update(userId, memoryId, updates)` (if available) or patch via create
- `delete(userId, memoryId)` → `svc.memories.delete(userId, memoryId, {})`
- `search(userId, query, limit)` → `svc.memories.search(userId, { query, limit })`
- `checkDuplicate(sourceMessageId)` → search by tag or metadata match

All methods: `const svc = await getRememberSvcClient()` then `res.throwOnError()`.

### 2. Create API Routes

Create TanStack file routes using `createFileRoute` + `server.handlers`:

- `src/routes/api/memories/feed.tsx` — GET, reads algorithm/scope/limit/offset from query params
- `src/routes/api/memories/search.tsx` — GET, reads query/limit from query params
- `src/routes/api/memories/index.tsx` — POST (create memory), GET (get by ID via query param)
- `src/routes/api/memories/rate.tsx` — POST, rate a memory

Each route: auth check via `getServerSession`, call `MemoryDatabaseService`, return JSON.

### 3. Update Client Service
Verify `src/services/memory.service.ts` (client-side) endpoints match the new API routes.

---

## Verification

- [ ] MemoryDatabaseService methods call real SvcClient
- [ ] Algorithm selector maps to correct SDK sort methods
- [ ] `/api/memories/feed` returns real memories
- [ ] `/api/memories/search` returns search results
- [ ] POST `/api/memories` creates a memory
- [ ] All routes check auth before proceeding
- [ ] `res.throwOnError()` pattern used consistently
