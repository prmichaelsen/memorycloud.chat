# Task 64: Integration Testing

**Milestone**: M15 - Ghost Space Integration
**Estimated Hours**: 1-2
**Status**: Not Started

---

## Objective

Verify end-to-end functionality of Ghost of the Void conversation with space memory queries. Ensure the AI can answer questions about memories shared in The Void.

---

## Context

With Tasks 60-63 complete, the full ghostOwner flow should work:
1. Chat route detects ghost conversation
2. WebSocket passes ghostOwner to ChatRoom DO
3. ChatRoom DO forwards ghostOwner to ChatEngine
4. ChatEngine queries space memories when responding

This task validates the integration works correctly.

---

## Test Cases

### 1. Ghost Conversation Initialization

**Objective**: Verify ghost conversation loads correctly

**Steps**:
1. Visit `/chat/ghost:space:the_void`
2. Open devtools → Console
3. Verify "Ghost conversation detected" log
4. Verify WebSocket connection established
5. Open devtools → Network → WS
6. Verify init message includes `ghostOwner: 'space:the_void'`

**Expected**:
- Page loads without errors
- WebSocket connected
- Init message has ghostOwner field

---

### 2. Memory Query Test

**Objective**: Verify AI queries space memories

**Setup**:
1. Post a test memory to The Void (via /void page or API)
2. Memory content: "The secret password is banana42"

**Steps**:
1. Visit `/chat/ghost:space:the_void`
2. Send message: "What is the secret password?"
3. Wait for AI response

**Expected**:
- AI response includes "banana42"
- AI references the memory from The Void
- No errors in console

---

### 3. Regular Chat Regression Test

**Objective**: Ensure regular agent chat still works

**Steps**:
1. Visit `/chat/main`
2. Send message: "Hello, what can you do?"
3. Verify AI responds normally

**Expected**:
- AI responds with capabilities
- No ghostOwner in WebSocket messages
- No errors or regressions

---

### 4. WebSocket Message Inspection

**Objective**: Verify WebSocket payloads are correct

**Steps**:
1. Visit `/chat/ghost:space:the_void`
2. Open devtools → Network → WS
3. Send a message
4. Inspect WebSocket frame

**Expected**:
```json
{
  "type": "message",
  "message": "test message",
  "userId": "...",
  "conversationId": "ghost:space:the_void",
  "ghostOwner": "space:the_void"
}
```

---

### 5. Server Logs Verification

**Objective**: Verify ChatRoom DO receives and processes ghostOwner

**Steps**:
1. Access server logs (Cloudflare Workers logs or local logs)
2. Send a message in ghost conversation
3. Search for "ghostOwner" in logs

**Expected**:
- Logs show ghostOwner received in ChatRoom DO
- Logs show ghostOwner passed to ChatEngine
- No errors related to ghostOwner

---

## Verification Checklist

- [ ] Ghost conversation initializes correctly
- [ ] AI can query space memories (test with actual void memory)
- [ ] Regular agent chat unaffected (no regression)
- [ ] WebSocket messages include ghostOwner when applicable
- [ ] Server logs confirm ghostOwner flow
- [ ] No TypeScript errors
- [ ] No runtime errors in console
- [ ] No WebSocket connection errors

---

## Known Issues & Workarounds

If memory query fails:
- Verify space:the_void exists in remember-core
- Check remember-core SDK configuration
- Verify Weaviate collection exists: `Memory_spaces_public`
- Check ChatEngine memory search implementation

If WebSocket doesn't include ghostOwner:
- Verify Task 60 changes in useWebSocket hook
- Check Task 63 changes in chat route
- Inspect WebSocket frame in devtools

---

## Rollback Plan

If critical issues found:
1. Revert changes to useWebSocket hook (Task 60)
2. Keep ChatRoom DO changes (Tasks 61-62) - they're backward compatible
3. Ghost conversation will fallback to regular agent behavior
4. No data loss or corruption risk

---

## Success Metrics

- **Functional**: AI can answer questions about void memories
- **Performance**: No latency increase vs regular agent chat
- **Stability**: No crashes or connection errors
- **Compatibility**: Regular chats unaffected

---

## Dependencies

- Tasks 60-63 completed
- ChatEngine memory search functional
- remember-core SDK configured
- The Void space exists with test memories

---

## Notes

- Test with multiple memories in The Void for best results
- If no memories exist, AI will respond with "no information found"
- Server logs are critical for debugging ghostOwner flow
- WebSocket devtools inspection is essential

---

## Design Reference

This integration test validates the full pattern ported from agentbase.me:
- Space ghost initialization
- Memory scoping via ghostOwner
- ChatEngine space memory queries
