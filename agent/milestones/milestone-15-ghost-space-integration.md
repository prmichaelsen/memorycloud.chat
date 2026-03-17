# Milestone 15: Ghost Space Integration

**Status**: Not Started
**Estimated Duration**: 1 week
**Tasks**: 5
**Priority**: High

---

## Goal

Enable the "Ghost of the Void" conversation to properly query memories from `space:the_void` by implementing `ghostOwner` parameter support throughout the chat stack (WebSocket, ChatRoom DO, ChatEngine).

---

## Overview

Currently, the Ghost of the Void conversation (`ghost:space:the_void`) doesn't pass context about which space's memories to search. This milestone ports agentbase.me's `ghostOwner` pattern to memorycloud.chat, enabling space ghosts to access and query their respective memory collections.

The implementation follows the same architecture as agentbase.me:
- Client passes `ghostOwner` via WebSocket
- ChatRoom DO extracts and forwards to ChatEngine
- ChatEngine uses `ghostOwner` to scope memory searches

---

## Deliverables

1. **useWebSocket Hook Enhancement**
   - Accept optional `ghostOwner` parameter
   - Include in init and message payloads

2. **ChatRoom DO Updates**
   - Add `ghostOwner` to ClientMessage interface
   - Extract from incoming messages
   - Pass to ChatEngine.processMessage()

3. **Chat Route Integration**
   - Detect `conversationId === 'ghost:space:the_void'`
   - Pass `ghostOwner: 'space:the_void'` to WebSocket

4. **Integration Testing**
   - Verify Ghost of the Void queries space memories
   - Test with actual void memories

---

## Success Criteria

- [ ] Ghost of the Void can answer questions about memories shared in The Void
- [ ] `ghostOwner` parameter flows through entire chat stack
- [ ] No regression in regular agent chat (main conversation)
- [ ] WebSocket init includes `ghostOwner` when applicable
- [ ] ChatEngine receives correct space context

---

## Dependencies

- Existing ChatEngine memory search infrastructure
- WebSocket Durable Object (ChatRoom)
- remember-core SDK for space memory queries

---

## Technical Approach

**Pattern Source**: agentbase.me implementation
- `src/lib/chat/websocket.ts` - ghostOwner in config and payloads
- `src/durable-objects/ChatRoom.ts` - ghostOwner extraction and forwarding
- `src/routes/spaces/$spaceId.tsx` - ghostOwner detection pattern

**Key Changes**:
1. WebSocket layer: Add optional `ghostOwner` param
2. ChatRoom DO: Extract and forward to ChatEngine
3. Chat route: Conditional ghostOwner based on conversationId
4. No ChatEngine changes needed (already supports ghostOwner)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| ChatEngine doesn't support ghostOwner | Verify with agentbase.me ChatEngine implementation (already ported) |
| Breaking regular agent chat | Test main conversation before/after changes |
| Space memory access errors | Validate space:the_void exists in remember-core |

---

## Testing Strategy

1. **Unit Tests**: WebSocket message format, ChatRoom DO message parsing
2. **Integration Tests**: End-to-end ghost conversation with space memory queries
3. **Manual Tests**:
   - Post memory to The Void
   - Ask Ghost of the Void about the memory
   - Verify response includes memory content

---

## Related Milestones

- M3: Memory Integration (memory query infrastructure)
- M8: LLM Integration (ChatEngine foundation)
- M14: Anonymous Message Limit (shares WebSocket modifications)

---

## Tasks

1. [Task 60](../tasks/milestone-15-ghost-space-integration/task-60-usewebsocket-ghostowner.md): Update useWebSocket Hook
2. [Task 61](../tasks/milestone-15-ghost-space-integration/task-61-chatroom-clientmessage.md): Update ChatRoom DO ClientMessage Interface
3. [Task 62](../tasks/milestone-15-ghost-space-integration/task-62-chatroom-forward-ghostowner.md): Update ChatRoom DO to Forward ghostOwner
4. [Task 63](../tasks/milestone-15-ghost-space-integration/task-63-chat-route-detection.md): Update Chat Route Ghost Detection
5. [Task 64](../tasks/milestone-15-ghost-space-integration/task-64-integration-testing.md): Integration Testing

---

**Created**: 2026-03-17
**Last Updated**: 2026-03-17
