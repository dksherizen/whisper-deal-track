export interface Deal {
  id: string;
  name: string;
  aliases: string | null;
  type: string | null;
  country: string | null;
  region: string | null;
  property_type: string | null;
  beds: number | null;
  tenure: string | null;
  condition: string | null;
  occupancy: number | null;
  operator: string | null;
  landlord: string | null;
  asking_price: number | null;
  currency: string | null;
  revenue: number | null;
  ebitda: number | null;
  ebitdar: number | null;
  rent_coverage: number | null;
  cqc_rating: string | null;
  regulatory_notes: string | null;
  seller: string | null;
  broker: string | null;
  broker_firm: string | null;
  solicitor_seller: string | null;
  solicitor_buyer: string | null;
  key_contact: string | null;
  internal_lead: string | null;
  partner: string | null;
  stage: string;
  next_step: string | null;
  next_step_owner: string | null;
  next_step_date: string | null;
  risks: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface TimelineEntry {
  id: string;
  deal_id: string;
  date: string;
  text: string;
  source: string;
  created_at: string;
}

export interface Delegation {
  id: string;
  deal_id: string;
  assignee: string;
  task: string;
  date: string;
  done: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  notes: string | null;
  added_at: string;
  user_id: string;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  is_error: boolean;
  created_at: string;
  user_id: string;
  chat_id: string | null;
}

// AI parsing types
export interface ParsedDeal {
  id: string | null;
  name: string;
  action: 'create' | 'update' | 'kill';
  fields?: Record<string, any>;
  timelineEntry?: string;
  delegations?: { assignee: string; task: string }[];
}

export interface ParsedContact {
  name: string;
  company?: string;
  role?: string;
  notes?: string;
}

export interface ParseResult {
  deals?: ParsedDeal[];
  contacts?: ParsedContact[];
  summary?: string;
  question?: string | null;
  command?: 'status' | 'query';
  dealName?: string;
}
