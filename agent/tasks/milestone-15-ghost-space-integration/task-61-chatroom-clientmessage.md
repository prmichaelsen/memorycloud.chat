# Task 61: Update ChatRoom DO ClientMessage Interface

**Milestone**: M15 - Ghost Space Integration
**Estimated Hours**: 0.5-1
**Status**: Not Started

---

## Objective

Add `ghostOwner` field to the ChatRoom Durable Object's `ClientMessage` interface to accept space ghost context from WebSocket messages.

---

## Context

The ChatRoom DO (`src/durable-objects/chat-room.ts`) defines a `ClientMessage` interface for incoming WebSocket messages. To support space ghosts, this interface needs a `ghostOwner` field.

**Reference**: agentbase.me's `src/durable-objects/ChatRoom.ts` lines 29-38 (ClientMessage interface with ghostOwner)

---

## Steps

### 1. Update ClientMessage Interface

Add optional `ghostOwner` field:

**File**: `src/durable-objects/chat-room.ts`

**Location**: ClientMessage interface (around line 25-35)

**Before**:
```typescript
interface ClientMessage {
  type: 'message' | 'load_messages' | 'init' | 'cancel'
  message?: MessageContent
  userId: string
  conversationId?: string
  limit?: number
  startAfter?: string
}
```

**After**:
```typescript
interface ClientMessage {
  type: 'message' | 'load_messages' | 'init' | 'cancel'
  message?: MessageContent
  userId: string
  conversationId?: string
  ghostOwner?: string  // NEW: Space/group/user ghost owner ID
  limit?: number
  startAfter?: string
}
```

### 2. Add JSDoc Comment

Document the ghostOwner field:

```typescript
interface ClientMessage {
  type: 'message' | 'load_messages' | 'init' | 'cancel'
  message?: MessageContent
  userId: string
  conversationId?: string
  /** Ghost owner user ID for ghost/persona conversations (e.g., 'space:the_void') */
  ghostOwner?: string
  limit?: number
  startAfter?: string
}
```

### 3. Verify TypeScript Compilation

Ensure no type errors after interface update:

```bash
npm run typecheck
```

---

## Verification Checklist

- [ ] `ghostOwner` field added to ClientMessage interface
- [ ] JSDoc comment added
- [ ] Field is optional (?)
- [ ] No TypeScript errors
- [ ] Other ChatRoom methods can access ghostOwner from ClientMessage

---

## Testing

**Type Check**:
```bash
npm run typecheck
```

**Expected**: No errors related to ClientMessage

---

## Dependencies

- None (interface-only change)

---

## Notes

- This is a type-only change; no runtime logic in this task
- `ghostOwner` will be extracted and used in Task 62
- Format examples:
  - `'space:the_void'` - The Void space ghost
  - `'group:abc123'` - Group ghost
  - `'user123'` - Personal ghost (future)

---

## Design Reference

From agentbase.me implementation:
- `src/durable-objects/ChatRoom.ts` lines 29-38: ClientMessage interface with ghostOwner field and JSDoc
