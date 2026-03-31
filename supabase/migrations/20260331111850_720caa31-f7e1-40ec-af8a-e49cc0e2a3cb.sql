
-- Create chats table
CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats" ON public.chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chats" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chats" ON public.chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chats" ON public.chats FOR DELETE USING (auth.uid() = user_id);

-- Add chat_id to messages
ALTER TABLE public.messages ADD COLUMN chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE;

-- Update deals SELECT policy: all authenticated users can view
DROP POLICY IF EXISTS "Users can view their own deals" ON public.deals;
CREATE POLICY "Authenticated users can view all deals" ON public.deals FOR SELECT TO authenticated USING (true);

-- Update timeline_entries SELECT policy
DROP POLICY IF EXISTS "Users can view timeline via deals" ON public.timeline_entries;
CREATE POLICY "Authenticated users can view all timeline entries" ON public.timeline_entries FOR SELECT TO authenticated USING (true);

-- Update delegations SELECT policy
DROP POLICY IF EXISTS "Users can view delegations via deals" ON public.delegations;
CREATE POLICY "Authenticated users can view all delegations" ON public.delegations FOR SELECT TO authenticated USING (true);

-- Update contacts SELECT policy
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.contacts;
CREATE POLICY "Authenticated users can view all contacts" ON public.contacts FOR SELECT TO authenticated USING (true);

-- Update deals UPDATE/DELETE to allow all authenticated (shared workspace)
DROP POLICY IF EXISTS "Users can update their own deals" ON public.deals;
CREATE POLICY "Authenticated users can update deals" ON public.deals FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can delete their own deals" ON public.deals;
CREATE POLICY "Authenticated users can delete deals" ON public.deals FOR DELETE TO authenticated USING (true);
