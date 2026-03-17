# Task 62: Update ChatRoom DO to Forward ghostOwner

**Milestone**: M15 - Ghost Space Integration
**Estimated Hours**: 1-2
**Status**: Not Started

---

## Objective

Extract `ghostOwner` from incoming ChatRoom DO messages and pass it to ChatEngine.processMessage() so the AI knows which space's memories to query.

---

## Context

The ChatRoom DO receives `ghostOwner` in WebSocket messages (Task 61) but doesn't currently extract or use it. ChatEngine.processMessage() already accepts a `ghostOwner` parameter (ported from agentbase.me), so we just need to thread it through.

**Reference**: agentbase.me's `src/durable-objects/ChatRoom.ts`:
- Lines 208, 292, 429: Extract ghostOwner from ClientMessage
- Line 350: Pass ghostOwner to ChatEngine.processMessage()

---

## Steps

### 1. Extract ghostOwner in handleInit

Update handleInit to extract ghostOwner:

**File**: `src/durable-objects/chat-room.ts`

**Location**: handleInit method (around line 150-200)

**Before**:
```typescript
private async handleInit(data: ClientMessage, socket: WebSocket): Promise<void> {
  const { userId, conversationId } = data
  // ...
}
```

**After**:
```typescript
private async handleInit(data: ClientMessage, socket: WebSocket): Promise<void> {
  const { userId, conversationId, ghostOwner } = data
  // ...
}
```

### 2. Extract ghostOwner in handleMessage

Update handleMessage to extract and pass ghostOwner:

**File**: `src/durable-objects/chat-room.ts`

**Location**: handleMessage method (around line 290-350)

**Before**:
```typescript
private async handleMessage(data: ClientMessage, socket: WebSocket): Promise<void> {
  const { userId, conversationId = 'main', message } = data
  // ...
}
```

**After**:
```typescript
private async handleMessage(data: ClientMessage, socket: WebSocket): Promise<void> {
  const { userId, conversationId = 'main', message, ghostOwner } = data
  // ...
}
```

### 3. Pass ghostOwner to ChatEngine

Find where ChatEngine.processMessage() is called and add ghostOwner parameter:

**File**: `src/durable-objects/chat-room.ts`

**Location**: Inside handleMessage, ChatEngine.processMessage call (around line 340-360)

**Before**:
```typescript
await this.chatEngine.processMessage({
  userId,
  conversationId,
  message,
  conversationType,
  saveMessage: true,
  signal: controller.signal,
  onMessage: (msg) => {
    // ... stream handling
  },
})
```

**After**:
```typescript
await this.chatEngine.processMessage({
  userId,
  conversationId,
  message,
  ghostOwner,  // NEW: Pass space context to ChatEngine
  conversationType,
  saveMessage: true,
  signal: controller.signal,
  onMessage: (msg) => {
    // ... stream handling
  },
})
```

### 4. Extract ghostOwner in handleLoadMessages (if applicable)

If load_messages handler exists, extract ghostOwner there too:

**File**: `src/durable-objects/chat-room.ts`

**Location**: handleLoadMessages method (if it exists)

**Update**:
```typescript
private async handleLoadMessages(data: ClientMessage, socket: WebSocket): Promise<void> {
  const { userId, conversationId = 'main', limit = 50, startAfter, ghostOwner } = data
  // ... use ghostOwner if needed for conversation type detection
}
```

---

## Verification Checklist

- [ ] `ghostOwner` extracted in handleInit
- [ ] `ghostOwner` extracted in handleMessage
- [ ] `ghostOwner` passed to ChatEngine.processMessage()
- [ ] `ghostOwner` extracted in handleLoadMessages (if applicable)
- [ ] No TypeScript errors
- [ ] Regular chats (no ghostOwner) still work

---

## Testing

**Manual Test (Regular Chat)**:
1. Visit `/chat/main`
2. Send a message
3. Verify AI responds normally
4. Check server logs: no ghostOwner logged

**Manual Test (Ghost Chat)**:
1. Visit `/chat/ghost:space:the_void`
2. Send a message: "What has been shared in The Void?"
3. Verify AI queries space memories
4. Check server logs: ghostOwner='space:the_void' logged

---

## Dependencies

- Task 61: ClientMessage interface updated
- ChatEngine.processMessage() already supports ghostOwner parameter

---

## Notes

- ChatEngine.processMessage() signature already includes `ghostOwner?: string` (ported from agentbase.me)
- No ChatEngine changes needed in this task
- The `ghostOwner` parameter tells ChatEngine to scope memory searches to a specific space/group

---

## Design Reference

From agentbase.me implementation:
- `src/durable-objects/ChatRoom.ts` line 208: Extract ghostOwner in handleInit
- `src/durable-objects/ChatRoom.ts` line 292: Extract ghostOwner in handleMessage
- `src/durable-objects/ChatRoom.ts` line 350: Pass ghostOwner to ChatEngine.processMessage()
