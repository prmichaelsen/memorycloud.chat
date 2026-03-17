# Task 60: Update useWebSocket Hook

**Milestone**: M15 - Ghost Space Integration
**Estimated Hours**: 1-2
**Status**: Not Started

---

## Objective

Add optional `ghostOwner` parameter to the useWebSocket hook to support space ghost conversations. This parameter identifies which space's memories the AI should query (e.g., `'space:the_void'`).

---

## Context

The useWebSocket hook (`src/hooks/useWebSocket.tsx`) manages WebSocket connections to the ChatRoom Durable Object. To enable space ghosts, it needs to accept and pass a `ghostOwner` parameter in both:
- Init message (connection handshake)
- Message payloads (each user message)

**Reference**: agentbase.me's `src/lib/chat/websocket.ts` lines 45-49 (config interface) and lines 104-109 (init message)

---

## Steps

### 1. Update Hook Interface

Add optional `ghostOwner` parameter to useWebSocket:

**File**: `src/hooks/useWebSocket.tsx`

**Location**: Hook parameters (around line 10-20)

```typescript
interface UseWebSocketProps {
  userId?: string
  conversationId?: string
  ghostOwner?: string  // NEW: e.g., 'space:the_void' for space ghosts
  onMessage?: (message: any) => void
  onConnectionChange?: (connected: boolean) => void
}
```

### 2. Pass ghostOwner in Init Message

Update the init message sent on connection:

**File**: `src/hooks/useWebSocket.tsx`

**Location**: WebSocket onopen handler or init effect

**Before**:
```typescript
wsSend({
  type: 'init',
  userId: user?.uid,
  conversationId: conversationId || 'main',
})
```

**After**:
```typescript
wsSend({
  type: 'init',
  userId: user?.uid,
  conversationId: conversationId || 'main',
  ...(ghostOwner && { ghostOwner }),  // Conditionally include if present
})
```

### 3. Pass ghostOwner in Message Payloads

Update the message send function to include ghostOwner:

**File**: `src/hooks/useWebSocket.tsx`

**Location**: wsSend function or handleSend callback

**Before**:
```typescript
wsSend({
  type: 'message',
  message: content,
  userId: user?.uid,
  conversationId,
})
```

**After**:
```typescript
wsSend({
  type: 'message',
  message: content,
  userId: user?.uid,
  conversationId,
  ...(ghostOwner && { ghostOwner }),  // Include in every message
})
```

### 4. Verify No Breakage for Regular Chats

Ensure ghostOwner is optional and doesn't affect regular agent chats:

**Test**:
- Main conversation (no ghostOwner): Should work normally
- DM/group conversations: Should work normally
- Ghost conversations: Should include ghostOwner

---

## Verification Checklist

- [ ] `ghostOwner` parameter added to hook interface
- [ ] Init message includes `ghostOwner` when provided
- [ ] Message payloads include `ghostOwner` when provided
- [ ] Regular chats (no ghostOwner) still work
- [ ] No TypeScript errors
- [ ] WebSocket messages logged correctly in devtools

---

## Testing

**Manual Test (Regular Chat)**:
1. Visit `/chat/main`
2. Send a message
3. Open devtools → Network → WS
4. Verify message does NOT include `ghostOwner`

**Manual Test (Ghost Chat)**:
1. Visit `/chat/ghost:space:the_void`
2. Send a message
3. Open devtools → Network → WS
4. Verify message includes `ghostOwner: 'space:the_void'`

---

## Dependencies

- None (standalone hook update)

---

## Notes

- `ghostOwner` format: `'space:{spaceId}'` for spaces, `'group:{groupId}'` for groups, or `{userId}` for personal ghosts
- Only spaces are supported in this milestone (The Void)
- Future: Extend to group ghosts and personal ghosts

---

## Design Reference

From agentbase.me implementation:
- `src/lib/chat/websocket.ts` lines 45-49: ChatWebSocketConfig interface
- `src/lib/chat/websocket.ts` lines 104-109: Init message with ghostOwner
- `src/lib/chat/websocket.ts` line 342: Message payload with ghostOwner
