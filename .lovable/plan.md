
# Deal Tracker — Implementation Plan

## Overview
AI-powered deal pipeline tracker for healthcare PE acquisitions. Joel types brain dumps → AI parses into structured deal data → Kanban board and list views show the pipeline.

## Phase 1: Foundation
- Set up dark theme design system (near-black backgrounds, stage colors, tight spacing)
- Create Supabase tables: `deals`, `timeline_entries`, `delegations`, `contacts`, `messages`
- Set up Supabase Auth (email/password)
- Create app layout with persistent header (stats bar, view toggle: Chat | Board | List, search, reset)

## Phase 2: Chat Interface
- Full-width chat view with message history (user bubbles right/blue, assistant left/dark)
- Multi-line input (Shift+Enter newline, Enter send)
- "Parsing..." loading indicator
- Persist messages to `messages` table, load on open
- Empty state prompt

## Phase 3: AI Parsing Edge Function
- `parse-deal-input` edge function calling Claude API (claude-sonnet-4-20250514)
- Send user message + last few messages for context + existing deal names/stages
- System prompt as specified (extract structured JSON, no advice)
- Handle special commands: status, query

## Phase 4: Deal Processing
- Frontend applies parsed JSON to database (create/update/kill deals)
- Deal matching logic: exact name → aliases → partial match → create if no match
- Auto-create timeline entries and delegations from parsed data
- Extract contacts from parsed data
- Display formatted confirmation + follow-up question in chat

## Phase 5: Status & Query Responses
- "Where do we stand" → query all deals, build formatted pipeline summary in chat
- Deal-specific queries → display full deal record with delegations and timeline in chat

## Phase 6: Board View (Kanban)
- Columns for each stage with color-coded headers
- Deal cards showing: name, location, tags (beds, price, tenure), next step
- Stale warning (⚠ Xd stale if 14+ days), risk flags
- Inactive stages (Completed, On Hold, Dead) shown separately, faded
- Click card → Deal Detail

## Phase 7: List View
- Table: Deal | Location | Beds | Price | Stage | Next Step | Updated | Flags
- Sorted by stage advancement
- Stale deals highlighted amber
- Click row → Deal Detail

## Phase 8: Deal Detail View
- Two-column layout: all deal fields (left) + delegations checklist & timeline (right)
- Edit mode with Save/Cancel
- Stage dropdown
- Add delegations and timeline entries manually
- Delete with confirmation

## Phase 9: Polish
- Header stats bar (active deals, total beds, pipeline value, stale count)
- Search across Board and List views
- Contacts sidebar (searchable list of non-deal contacts)
- Reset button with confirmation dialog
