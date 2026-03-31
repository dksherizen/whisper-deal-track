

# Fix: Deals not saving to database

## Root Cause Analysis

The code in `deal-processor.ts` already has camelCase→snake_case field mapping and processes deals individually. However, it has these problems:

1. **No error checking on updates** (lines 93-97) — if a Supabase update fails, it's silently ignored
2. **No error checking on timeline/delegation inserts** — failures are silent
3. **No success/failure count returned** — `processParsedResult` returns an actions string but `use-deals.ts` ignores it and uses `result.summary` instead
4. **Possible exception mid-loop** — if any unhandled error occurs, remaining deals are skipped entirely

## Changes

### 1. `src/lib/deal-processor.ts` — Add error handling on every DB operation + return counts

- Wrap every `supabase.from().update()` and `supabase.from().insert()` call with error checking
- Add `console.error` logging for every failed operation with the deal name and error details
- Track `savedCount` and `failedCount` throughout the loop
- Change return type to `{ actions: string[], savedCount: number, totalCount: number }` so the caller can detect mismatches
- Add try/catch around each individual deal's processing so one failure doesn't kill the rest

### 2. `src/hooks/use-deals.ts` — Use the returned counts to warn user

- After `processParsedResult` returns, check if `savedCount < totalCount`
- If mismatch, append: `"⚠ {failedCount} of {totalCount} deals may not have saved. Check the board."`
- Keep existing heuristic warning about missed deals in parsing

### 3. `src/lib/types.ts` — No changes needed

All types are already correct. The `ParseResult` and `ParsedDeal` interfaces match the AI output format.

## File Summary

| File | Change |
|------|--------|
| `src/lib/deal-processor.ts` | Add error checking on all DB ops, console.error logging, return saved/total counts |
| `src/hooks/use-deals.ts` | Use counts from processParsedResult to show save-failure warnings |

