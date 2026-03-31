

## Plan: Speed up AI parsing

**Changes to `supabase/functions/parse-deal-input/index.ts`:**
1. Change model from `"anthropic/claude-opus-4"` to `"anthropic/claude-sonnet-4-20250514"`
2. Reduce `max_tokens` from 2000 to 1500
3. The system prompt already ends with the required "RESPOND WITH ONLY THE JSON OBJECT..." line — no change needed there

Single file, two line changes. Redeploy edge function after.

