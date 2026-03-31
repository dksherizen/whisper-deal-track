
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  aliases TEXT,
  type TEXT CHECK (type IN ('single', 'portfolio', 'platform', 'jv')),
  country TEXT CHECK (country IN ('UK', 'US', 'Other')),
  region TEXT,
  property_type TEXT CHECK (property_type IN ('care_home', 'nursing_home', 'assisted_living', 'residential', 'mixed', 'other')),
  beds INTEGER,
  tenure TEXT CHECK (tenure IN ('freehold', 'leasehold', 'mixed')),
  condition TEXT,
  occupancy NUMERIC,
  operator TEXT,
  landlord TEXT,
  asking_price NUMERIC,
  currency TEXT DEFAULT 'GBP' CHECK (currency IN ('GBP', 'USD')),
  revenue NUMERIC,
  ebitda NUMERIC,
  ebitdar NUMERIC,
  rent_coverage NUMERIC,
  cqc_rating TEXT,
  regulatory_notes TEXT,
  seller TEXT,
  broker TEXT,
  broker_firm TEXT,
  solicitor_seller TEXT,
  solicitor_buyer TEXT,
  key_contact TEXT,
  internal_lead TEXT,
  partner TEXT,
  stage TEXT NOT NULL DEFAULT 'identified' CHECK (stage IN ('identified', 'initial_review', 'engaged', 'due_diligence', 'hot_loi', 'legal_closing', 'completed', 'on_hold', 'dead')),
  next_step TEXT,
  next_step_owner TEXT,
  next_step_date DATE,
  risks TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own deals" ON public.deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own deals" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own deals" ON public.deals FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Timeline entries
CREATE TABLE public.timeline_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  text TEXT NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('ai', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.timeline_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view timeline via deals" ON public.timeline_entries FOR SELECT USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = timeline_entries.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can insert timeline via deals" ON public.timeline_entries FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = timeline_entries.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can update timeline via deals" ON public.timeline_entries FOR UPDATE USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = timeline_entries.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can delete timeline via deals" ON public.timeline_entries FOR DELETE USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = timeline_entries.deal_id AND deals.user_id = auth.uid()));

-- Delegations
CREATE TABLE public.delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  assignee TEXT NOT NULL,
  task TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view delegations via deals" ON public.delegations FOR SELECT USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = delegations.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can insert delegations via deals" ON public.delegations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = delegations.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can update delegations via deals" ON public.delegations FOR UPDATE USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = delegations.deal_id AND deals.user_id = auth.uid()));
CREATE POLICY "Users can delete delegations via deals" ON public.delegations FOR DELETE USING (EXISTS (SELECT 1 FROM public.deals WHERE deals.id = delegations.deal_id AND deals.user_id = auth.uid()));

-- Contacts
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  notes TEXT,
  added_at DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  text TEXT NOT NULL,
  is_error BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own messages" ON public.messages FOR DELETE USING (auth.uid() = user_id);
