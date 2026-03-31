

# Fix: App not loading (preview timeout)

## Root Cause

The code is syntactically correct with no build errors. The "took too long to respond" is most likely caused by a **render loop** in `Index.tsx`:

The `useEffect` on lines 30-38 watches `[userId, chats, chatsLoading, currentChatId]`. When `chats` is empty, it calls `createChat()`, which calls `setChats(prev => [data, ...prev])` inside `useChats`. This changes `chats`, re-triggering the effect. If the chat insert fails (e.g. RLS issue), `chats` stays empty and `currentChatId` stays null, causing an infinite loop of `createChat` calls.

Additionally, `fetchChats` is in the dependency array of its own `useEffect` inside `useChats`, and is recreated on every render if `userId` changes — but that should be stable with `useCallback`.

## Fixes

### 1. `src/pages/Index.tsx` — Guard against infinite chat creation loop

Add a `ref` to track whether chat creation is already in progress. Prevent the effect from calling `createChat` more than once.

### 2. `src/hooks/use-deals.ts` — Add error handling to `createChat`

If `createChat` fails, it currently returns `null` but the effect in Index keeps retrying. Add a flag or guard.

### 3. `src/hooks/use-deals.ts` — Stabilize `fetchChats` reference

Ensure `fetchChats` doesn't cause unnecessary re-renders by verifying the `useCallback` dependencies are stable.

## File Summary

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add `useRef` guard to prevent repeated `createChat` calls in the auto-create effect |
| `src/hooks/use-deals.ts` | Add error logging to `createChat`, ensure stable callback references |

