# Task 63: Update Chat Route Ghost Detection

**Milestone**: M15 - Ghost Space Integration
**Estimated Hours**: 1
**Status**: Not Started

---

## Objective

Detect when the chat route is viewing a ghost conversation (`ghost:space:the_void`) and pass the appropriate `ghostOwner` parameter to the WebSocket connection.

---

## Context

The chat route (`src/routes/chat/$conversationId.tsx`) needs to detect space ghost conversations and pass `ghostOwner` to the useWebSocket hook. This enables the AI to query the correct space's memories.

**Pattern**: `conversationId === 'ghost:space:the_void'` → `ghostOwner: 'space:the_void'`

**Reference**: agentbase.me's `src/components/ghost/GhostChatView.tsx` line 111 (passes ghostOwnerId to ChatInterface)

---

## Steps

### 1. Detect Ghost Conversation

Add logic to determine ghostOwner based on conversationId:

**File**: `src/routes/chat/$conversationId.tsx`

**Location**: Inside ConversationView component, before WebSocket hook call (around line 95-120)

**Add**:
```typescript
// Determine if this is a ghost conversation
const ghostOwner = conversationId.startsWith('ghost:space:')
  ? conversationId.replace('ghost:', '')  // 'ghost:space:the_void' → 'space:the_void'
  : undefined
```

### 2. Pass ghostOwner to useWebSocket

Update the useWebSocket hook invocation:

**File**: `src/routes/chat/$conversationId.tsx`

**Location**: useWebSocket hook call (around line 120-140)

**Before**:
```typescript
const { wsStatus, wsSend } = useWebSocket({
  conversationId,
  onMessage: (msg) => {
    // ... handle messages
  },
})
```

**After**:
```typescript
const { wsStatus, wsSend } = useWebSocket({
  conversationId,
  ghostOwner,  // NEW: Pass ghost context
  onMessage: (msg) => {
    // ... handle messages
  },
})
```

### 3. Add Debug Logging (Optional)

Log ghostOwner for troubleshooting:

```typescript
const ghostOwner = conversationId.startsWith('ghost:space:')
  ? conversationId.replace('ghost:', '')
  : undefined

if (ghostOwner) {
  console.log('[ChatRoute] Ghost conversation detected', { conversationId, ghostOwner })
}
```

---

## Verification Checklist

- [ ] `ghostOwner` derived from `conversationId`
- [ ] `ghostOwner` passed to useWebSocket hook
- [ ] Regular conversations (no ghost prefix) have `ghostOwner: undefined`
- [ ] Ghost conversations have correct `ghostOwner` value
- [ ] No TypeScript errors
- [ ] Debug logging added (optional)

---

## Testing

**Manual Test (Regular Chat)**:
1. Visit `/chat/main`
2. Open devtools console
3. Verify no "Ghost conversation detected" log
4. Send a message
5. Verify WebSocket message has no `ghostOwner`

**Manual Test (Ghost Chat)**:
1. Visit `/chat/ghost:space:the_void`
2. Open devtools console
3. Verify "Ghost conversation detected" log with `ghostOwner: 'space:the_void'`
4. Send a message
5. Verify WebSocket message includes `ghostOwner: 'space:the_void'`

---

## Dependencies

- Task 60: useWebSocket accepts ghostOwner parameter

---

## Notes

- **Naming Convention**: conversationId uses `ghost:space:the_void`, ghostOwner uses `space:the_void` (no "ghost:" prefix)
- **Future Extensions**:
  - `ghost:group:{groupId}` → `ghostOwner: 'group:{groupId}'`
  - `ghost:user:{userId}` → `ghostOwner: '{userId}'`
- Only space ghosts are implemented in this milestone

---

## Design Reference

From agentbase.me implementation:
- `src/components/ghost/GhostChatView.tsx` line 111: Pass ghostOwnerId to ChatInterface
- `src/routes/spaces/$spaceId.tsx` line 246: Set ghostOwnerId as `space:${spaceId}`
