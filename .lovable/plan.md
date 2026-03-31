

# Multi-Chat, Shared Workspace, and Parsing Improvements

## 1. Database Changes

**New `chats` table:**
- `id` (uuid, PK), `title` (text, default 'New Chat'), `created_at` (timestamptz), `updated_at` (timestamptz), `user_id` (uuid)
- RLS: users see only their own chats (INSERT/SELECT/UPDATE/DELETE filtered by `auth.uid() = user_id`)

**Alter `messages` table:**
- Add `chat_id` (uuid, nullable initially for migration, then foreign key to `chats.id` with `ON DELETE CASCADE`)

**Alter RLS on deals, timeline_entries, delegations, contacts:**
- Change SELECT policies to allow ALL authenticated users to read (not just `user_id = auth.uid()`)
- Keep INSERT policies requiring `user_id = auth.uid()` (tracks creator)
- Keep UPDATE/DELETE restricted to owner

## 2. Edge Function: `parse-deal-input`

- Increase `max_tokens` from 1500 to 3000
- Update system prompt: instruct model to list each deal on a separate line in the summary as `DEAL NAME — action taken (new / updated / marked dead)`, then blank line, then summary text, then question

## 3. Client-Side Parsing Improvements

**`deal-processor.ts`** — field mapping already exists and looks correct. No changes needed there.

**`use-deals.ts`** — after processing parsed result, add a heuristic check: count unique ALLCAPS multi-word sequences in the original input text, compare against `result.deals?.length`. If input mentions more deal-like names than returned, append a warning to the assistant response: "I may have missed some deals in that dump. Try sending updates for specific deals separately if something's missing."

## 4. Multi-Chat System

**New types in `types.ts`:**
- `Chat` interface: `id`, `title`, `created_at`, `updated_at`, `user_id`
- Add `chat_id` to `Message` interface

**New hook: `useChats(userId)`**
- Fetch all chats for user, ordered by `updated_at` desc
- `createChat()` — inserts new chat, returns it
- `deleteChat(chatId)` — deletes chat (messages cascade)
- `updateChatTitle(chatId, title)`

**Update `useMessages`:**
- Accept `chatId` parameter, filter messages by `chat_id`
- `addMessage` includes `chat_id`

**Update `useDealChat`:**
- Works within current chat context
- Deals context always pulls from shared deals table (already does this)

## 5. UI Changes

**`ChatView.tsx`** — add a left sidebar/panel showing chat list:
- List of chats with title and relative timestamp
- "New Chat" button at top
- Click chat to switch
- Delete button per chat with confirmation dialog
- Active chat highlighted

**`Header.tsx`:**
- Remove the Reset button (the nuclear option)
- Add a "Delete All Deals" option inside a settings dropdown (with double confirmation)

**`Index.tsx`:**
- Manage `currentChatId` state
- On first load, select most recent chat or auto-create one
- Pass chat switching handlers to ChatView
- Wire up `useMessages` with `chatId`

## 6. Shared Data RLS Changes

Deals, timeline_entries, delegations, contacts SELECT policies become:
```sql
-- Allow all authenticated users to view
USING (auth.uid() IS NOT NULL)
```
INSERT stays as `auth.uid() = user_id`. UPDATE/DELETE stay owner-only.

## File Change Summary

| File | Change |
|------|--------|
| Migration SQL | New `chats` table, alter `messages`, update RLS policies |
| `src/lib/types.ts` | Add `Chat` type, add `chat_id` to `Message` |
| `src/hooks/use-deals.ts` | Add `useChats` hook, update `useMessages` for chat_id, add deal-count mismatch warning |
| `src/components/ChatView.tsx` | Add chat sidebar with list, new chat, delete chat |
| `src/components/Header.tsx` | Remove Reset button, add settings dropdown with "Delete All Deals" |
| `src/pages/Index.tsx` | Wire up multi-chat state management |
| `supabase/functions/parse-deal-input/index.ts` | Increase max_tokens to 3000, update summary format in system prompt |
| `src/lib/deal-processor.ts` | No changes needed (field mapping already correct) |

