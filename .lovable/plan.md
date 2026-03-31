

# Message Queue System

## Overview
Allow the user to keep typing and sending messages while previous ones are still being parsed. Messages queue up and process sequentially, with the deals list refreshed between each so later messages can reference deals created by earlier ones.

## Architecture

The queue logic lives in `useDealChat`. ChatView becomes a "dumb" UI that never blocks input.

```text
User types → onSend → addToQueue → [queue processes sequentially]
                                        ↓
                                   process msg 1 → refetchDeals
                                        ↓
                                   process msg 2 (with fresh deals) → refetchDeals
                                        ↓
                                   ...
```

## Changes

### 1. `src/hooks/use-deals.ts` — `useDealChat`
- Replace single `parsing` boolean with `queue: string[]` array and `processing: boolean` state
- Expose `queueCount` (number of queued + currently processing messages)
- `sendMessage` now just pushes text onto the queue (never blocks)
- Add a `useEffect` that watches the queue: when `processing` is false and queue is non-empty, shift the first item off and process it
- After each message processes, call `refetchDeals()` so the next message gets fresh deal names
- Re-fetch deals at the start of each queued message processing (read latest `deals` from a ref to avoid stale closure)
- Keep `parsing` as a derived value (`processing || queue.length > 0`) for backward compat with Header if needed

### 2. `src/components/ChatView.tsx`
- Add `queuedTexts: string[]` and `queueCount: number` to props
- Remove `parsing` gate from `handleSend` — send button always works when input is non-empty
- Show queued user messages (not yet in DB) as user bubbles with a small "queued" badge
- Keep the "Parsing..." indicator when `processing` is true
- Show queue counter above input: "2 messages queued..." when `queueCount > 0`
- Button `disabled` only when input is empty (never disabled for parsing)

### 3. `src/pages/Index.tsx`
- Pass new props (`queuedTexts`, `queueCount`) from `useDealChat` down to `ChatView`

## Technical Details

**Queue state in `useDealChat`:**
```
queue: string[]           — pending message texts
processing: boolean       — true while one message is being parsed
queuedTexts: string[]     — exposed for UI (includes currently processing)
queueCount: number        — queue.length (excluding the one currently processing)
```

**Fresh deals per message:** Use a `useRef` for deals so the processing loop always reads the latest value after `refetchDeals()` completes, avoiding stale closures.

**Queued bubble rendering:** ChatView renders `queuedTexts` as user-styled bubbles with an opacity-60 "queued" label beneath. These disappear as messages get persisted to DB and appear in the real `messages` array.

