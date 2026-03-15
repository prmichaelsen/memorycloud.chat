# Milestone 6: Wire remember-core

**Status**: Not Started
**Estimated Duration**: 1 week
**Dependencies**: M5 (Pattern Migration complete)
**Source**: Production integration — connect to real memory backend

---

## Goal

Integrate `@prmichaelsen/remember-core` SvcClient SDK into remember-enterprise's DatabaseService layer and API routes, enabling real memory CRUD, search, feed, ratings, and ghost conversations against the shared remember-core backend.

## Deliverables

- `src/lib/remember-sdk.ts` — singleton SvcClient, config from shared Firestore
- MemoryDatabaseService wired to SvcClient methods
- GhostDatabaseService wired to SvcClient with trust filtering
- `/api/memories/*` routes (feed, search, get, create, rate)
- `/api/ghost/*` routes (list, conversation, send)

## Success Criteria

- [ ] `getRememberSvcClient()` reads config from shared Firestore `REST_API_CONFIGURATIONS`
- [ ] Memory feed renders real memories from Weaviate via SvcClient
- [ ] Memory search returns real results
- [ ] Save-as-memory CTA creates real memories
- [ ] Ghost tab queries memories with trust-tier filtering
- [ ] Algorithm selector maps to SDK sort modes correctly

## Tasks

- [Task 22: Install + Configure SvcClient](../tasks/milestone-6-wire-remember-core/task-22-install-configure-svcclient.md)
- [Task 23: Wire MemoryDatabaseService](../tasks/milestone-6-wire-remember-core/task-23-wire-memory-database-service.md)
- [Task 24: Wire GhostDatabaseService](../tasks/milestone-6-wire-remember-core/task-24-wire-ghost-database-service.md)
