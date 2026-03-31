import { supabase } from "@/integrations/supabase/client";
import type { Deal, ParseResult, ParsedDeal } from "@/lib/types";

// Field mapping from camelCase (AI output) to snake_case (DB)
const FIELD_MAP: Record<string, string> = {
  propertyType: 'property_type',
  askingPrice: 'asking_price',
  rentCoverage: 'rent_coverage',
  cqcRating: 'cqc_rating',
  regulatoryNotes: 'regulatory_notes',
  brokerFirm: 'broker_firm',
  solicitorSeller: 'solicitor_seller',
  solicitorBuyer: 'solicitor_buyer',
  keyContact: 'key_contact',
  internalLead: 'internal_lead',
  nextStep: 'next_step',
  nextStepOwner: 'next_step_owner',
  nextStepDate: 'next_step_date',
};

function mapFields(fields: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') continue;
    const dbKey = FIELD_MAP[key] || key;
    mapped[dbKey] = value;
  }
  return mapped;
}

function matchDeal(parsed: ParsedDeal, deals: Deal[]): Deal | null {
  const name = parsed.name?.toUpperCase() || '';
  const idHint = parsed.id?.toUpperCase() || '';

  // Exact name match
  let match = deals.find(d => d.name.toUpperCase() === name);
  if (match) return match;

  // Match by id hint
  if (idHint) {
    match = deals.find(d => d.name.toUpperCase() === idHint);
    if (match) return match;
  }

  // Name appears in aliases
  match = deals.find(d => d.aliases?.toUpperCase().includes(name));
  if (match) return match;

  // Existing deal name appears in incoming name
  match = deals.find(d => name.includes(d.name.toUpperCase()));
  if (match) return match;

  // Partial match on id hint
  if (idHint) {
    match = deals.find(d => d.aliases?.toUpperCase().includes(idHint) || idHint.includes(d.name.toUpperCase()));
    if (match) return match;
  }

  return null;
}

export async function processParsedResult(
  result: ParseResult,
  existingDeals: Deal[],
  userId: string
): Promise<string> {
  const actions: string[] = [];

  if (result.deals) {
    for (const parsedDeal of result.deals) {
      const existingDeal = matchDeal(parsedDeal, existingDeals);

      if (parsedDeal.action === 'kill') {
        if (existingDeal) {
          await supabase.from('deals').update({ stage: 'dead', updated_at: new Date().toISOString() }).eq('id', existingDeal.id);
          if (parsedDeal.timelineEntry) {
            await supabase.from('timeline_entries').insert({
              deal_id: existingDeal.id,
              text: parsedDeal.timelineEntry,
              source: 'ai',
            });
          }
          actions.push(`${parsedDeal.name} — marked DEAD`);
        } else {
          actions.push(`⚠ Couldn't find a deal matching "${parsedDeal.name}" to mark as dead.`);
        }
        continue;
      }

      if (parsedDeal.action === 'update' && existingDeal) {
        const fields = parsedDeal.fields ? mapFields(parsedDeal.fields) : {};
        if (Object.keys(fields).length > 0) {
          await supabase.from('deals').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', existingDeal.id);
        } else {
          await supabase.from('deals').update({ updated_at: new Date().toISOString() }).eq('id', existingDeal.id);
        }

        if (parsedDeal.timelineEntry) {
          await supabase.from('timeline_entries').insert({
            deal_id: existingDeal.id,
            text: parsedDeal.timelineEntry,
            source: 'ai',
          });
        }

        if (parsedDeal.delegations?.length) {
          for (const del of parsedDeal.delegations) {
            await supabase.from('delegations').insert({
              deal_id: existingDeal.id,
              assignee: del.assignee,
              task: del.task,
            });
          }
        }

        actions.push(`${parsedDeal.name} — updated`);
        continue;
      }

      // Create new deal (or update action with no match)
      const fields = parsedDeal.fields ? mapFields(parsedDeal.fields) : {};
      const { data: newDeal, error } = await supabase
        .from('deals')
        .insert({ name: parsedDeal.name, ...fields, user_id: userId })
        .select()
        .single();

      if (error || !newDeal) {
        console.error('Failed to create deal:', error);
        actions.push(`${parsedDeal.name} — failed to create`);
        continue;
      }

      if (parsedDeal.timelineEntry) {
        await supabase.from('timeline_entries').insert({
          deal_id: newDeal.id,
          text: parsedDeal.timelineEntry,
          source: 'ai',
        });
      }

      if (parsedDeal.delegations?.length) {
        for (const del of parsedDeal.delegations) {
          await supabase.from('delegations').insert({
            deal_id: newDeal.id,
            assignee: del.assignee,
            task: del.task,
          });
        }
      }

      actions.push(`${parsedDeal.name} — new deal`);
    }
  }

  if (result.contacts?.length) {
    for (const contact of result.contacts) {
      if (contact.name) {
        await supabase.from('contacts').insert({
          name: contact.name,
          company: contact.company || null,
          role: contact.role || null,
          notes: contact.notes || null,
          user_id: userId,
        });
        actions.push(`Contact: ${contact.name}`);
      }
    }
  }

  return actions.join('\n');
}

export function buildStatusResponse(deals: Deal[]): string {
  const active = deals.filter(d => !['completed', 'on_hold', 'dead'].includes(d.stage));
  const dead = deals.filter(d => d.stage === 'dead');
  const onHold = deals.filter(d => d.stage === 'on_hold');
  const completed = deals.filter(d => d.stage === 'completed');

  const stageOrder = ['legal_closing', 'hot_loi', 'due_diligence', 'engaged', 'initial_review', 'identified'];

  const sorted = [...active].sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage));

  let text = `ACTIVE PIPELINE (${active.length} deals)\n\n`;

  for (const deal of sorted) {
    const price = deal.asking_price ? `${deal.currency === 'USD' ? '$' : '£'}${(deal.asking_price / 1_000_000).toFixed(1)}M` : '';
    const staleD = daysSince(deal.updated_at);

    text += `${deal.name}`;
    if (deal.region) text += ` | ${deal.region}`;
    if (price) text += ` | ${price}`;
    text += ` | ${deal.stage.replace('_', ' ').toUpperCase()}\n`;

    const tags = [];
    if (deal.beds) tags.push(`${deal.beds} beds`);
    if (deal.tenure) tags.push(deal.tenure);
    if (deal.occupancy) tags.push(`${deal.occupancy}% occ`);
    if (tags.length) text += `  ${tags.join(' · ')}\n`;

    if (deal.next_step) {
      text += `  → ${deal.next_step}`;
      if (deal.next_step_owner) text += ` (${deal.next_step_owner})`;
      text += '\n';
    }

    if (staleD >= 14) text += `  ⚠ ${staleD}d stale\n`;
    if (deal.risks) text += `  ⚠ ${deal.risks}\n`;
    text += '\n';
  }

  if (dead.length) text += `\nDEAD (${dead.length})\n${dead.map(d => d.name).join(', ')}\n`;
  if (onHold.length) text += `\nON HOLD (${onHold.length})\n${onHold.map(d => d.name).join(', ')}\n`;
  if (completed.length) text += `\nCOMPLETED (${completed.length})\n${completed.map(d => d.name).join(', ')}\n`;

  return text;
}

export function buildDealQueryResponse(deal: Deal, timeline: any[], delegations: any[]): string {
  let text = `${deal.name}\n${'—'.repeat(deal.name.length)}\n\n`;

  const fields: [string, any][] = [
    ['Stage', deal.stage.replace('_', ' ').toUpperCase()],
    ['Type', deal.type],
    ['Country', deal.country],
    ['Region', deal.region],
    ['Property', deal.property_type?.replace('_', ' ')],
    ['Beds', deal.beds],
    ['Tenure', deal.tenure],
    ['Occupancy', deal.occupancy ? `${deal.occupancy}%` : null],
    ['Condition', deal.condition],
    ['Asking Price', deal.asking_price ? `${deal.currency === 'USD' ? '$' : '£'}${(deal.asking_price / 1_000_000).toFixed(1)}M` : null],
    ['Revenue', deal.revenue ? `${deal.currency === 'USD' ? '$' : '£'}${(deal.revenue / 1_000_000).toFixed(1)}M` : null],
    ['EBITDA', deal.ebitda ? `${deal.currency === 'USD' ? '$' : '£'}${(deal.ebitda / 1_000_000).toFixed(1)}M` : null],
    ['EBITDAR', deal.ebitdar ? `${deal.currency === 'USD' ? '$' : '£'}${(deal.ebitdar / 1_000_000).toFixed(1)}M` : null],
    ['CQC Rating', deal.cqc_rating],
    ['Operator', deal.operator],
    ['Landlord', deal.landlord],
    ['Seller', deal.seller],
    ['Broker', deal.broker],
    ['Broker Firm', deal.broker_firm],
    ['Key Contact', deal.key_contact],
    ['Internal Lead', deal.internal_lead],
    ['Partner', deal.partner],
    ['Next Step', deal.next_step],
    ['Next Step Owner', deal.next_step_owner],
    ['Target Date', deal.next_step_date],
    ['Risks', deal.risks],
    ['Notes', deal.notes],
  ];

  for (const [label, value] of fields) {
    if (value) text += `${label}: ${value}\n`;
  }

  if (delegations.length) {
    text += `\nDELEGATIONS\n`;
    for (const d of delegations) {
      text += `${d.done ? '☑' : '☐'} ${d.assignee}: ${d.task} (${d.date})\n`;
    }
  }

  if (timeline.length) {
    text += `\nTIMELINE (last 10)\n`;
    for (const t of timeline.slice(0, 10)) {
      text += `${t.date}: ${t.text}\n`;
    }
  }

  return text;
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}
