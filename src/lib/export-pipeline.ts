import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import type { Deal } from '@/lib/types';
import { formatCurrency } from '@/lib/constants';

const NAVY = '1B2A4A';
const LIGHT_BLUE = 'F0F4F8';
const STAGE_COLORS: Record<string, string> = {
  legal_closing: '10B981',
  hot_loi: '059669',
  due_diligence: 'F59E0B',
  engaged: '8B5CF6',
  initial_review: '3B82F6',
  identified: '6B7280',
  dead: 'EF4444',
  completed: '10B981',
  on_hold: '9CA3AF',
};

const STAGE_ORDER = ['legal_closing', 'hot_loi', 'due_diligence', 'engaged', 'initial_review', 'identified'];
const INACTIVE_STAGES = ['completed', 'on_hold', 'dead'];

function currencySymbol(c: string | null): string {
  if (c === 'EUR') return '€';
  if (c === 'USD') return '$';
  return '£';
}

function fmt(val: number | null, currency: string | null): string {
  if (val == null) return '—';
  const sym = currencySymbol(currency);
  if (val >= 1_000_000) return `${sym}${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${sym}${Math.round(val / 1_000)}K`;
  return `${sym}${val}`;
}

function fmtCurrency(val: number | null, currency: string | null): string {
  if (val == null) return '—';
  const sym = currencySymbol(currency);
  return `${sym}${val.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function stageLabel(key: string): string {
  const map: Record<string, string> = {
    identified: 'Identified', initial_review: 'Initial Review', engaged: 'Engaged',
    due_diligence: 'Due Diligence', hot_loi: 'HoT / LOI', legal_closing: 'Legal / Closing',
    completed: 'Completed', on_hold: 'On Hold', dead: 'Dead',
  };
  return map[key] ?? key;
}

const PIPELINE_HEADERS = [
  'Deal', 'Stage', 'Type', 'Country', 'Region', 'Beds', 'Occupancy', 'Tenure',
  'Property Type', 'Ask', '£/Bed', 'EBITDARM', 'EBITDAR', 'EBITDA', 'CQC',
  'Operator', 'Landlord', 'Seller', 'Broker', 'Broker Firm',
  'Solicitor (Seller)', 'Solicitor (Buyer)', 'Key Contact', 'Internal Lead',
  'Next Step', 'Next Step Owner', 'Target Date', 'Risks', 'Notes',
  'Last Update', 'Updated',
];

const COL_WIDTHS = [
  24, 16, 12, 10, 18, 8, 10, 12, 14, 14, 10, 14, 14, 14, 18,
  18, 20, 18, 16, 16, 18, 18, 16, 14, 30, 14, 12, 30, 40, 14, 12,
];

export async function exportPipeline(userId: string) {
  // Fetch data
  const [dealsRes, delegationsRes, timelineRes] = await Promise.all([
    supabase.from('deals').select('*').order('updated_at', { ascending: false }),
    supabase.from('delegations').select('*').order('date', { ascending: false }),
    supabase.from('timeline_entries').select('*').order('created_at', { ascending: false }),
  ]);

  const deals = (dealsRes.data ?? []) as Deal[];
  const delegations = delegationsRes.data ?? [];
  const timeline = timelineRes.data ?? [];

  // Group timeline by deal - latest per deal
  const latestTimeline: Record<string, { text: string; date: string }> = {};
  for (const t of timeline) {
    if (!latestTimeline[t.deal_id]) {
      latestTimeline[t.deal_id] = { text: t.text, date: t.created_at };
    }
  }

  // Sort deals: active by stage priority, then inactive at bottom
  const active = deals.filter(d => !INACTIVE_STAGES.includes(d.stage));
  const inactive = deals.filter(d => INACTIVE_STAGES.includes(d.stage));
  active.sort((a, b) => {
    const ai = STAGE_ORDER.indexOf(a.stage);
    const bi = STAGE_ORDER.indexOf(b.stage);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const sortedDeals = [...active, ...inactive];

  // Stats
  const activeBeds = active.reduce((s, d) => s + (d.beds || 0), 0);
  const activeValue = active.reduce((s, d) => s + (d.asking_price || 0), 0);

  // Build Pipeline sheet data
  const wsData: (string | number | null)[][] = [];

  // Row 1: Title
  wsData.push(['UK CARE HOMES PIPELINE', ...Array(PIPELINE_HEADERS.length - 1).fill(null)]);
  // Row 2: Metadata
  const exportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  wsData.push([`Exported: ${exportDate} | ${active.length} active deals | ${activeBeds} beds | ${formatCurrency(activeValue)} pipeline`, ...Array(PIPELINE_HEADERS.length - 1).fill(null)]);
  // Row 3: Spacer
  wsData.push(Array(PIPELINE_HEADERS.length).fill(null));
  // Row 4: Headers
  wsData.push(PIPELINE_HEADERS);

  // Data rows
  let addedDivider = false;
  for (const d of sortedDeals) {
    if (!addedDivider && INACTIVE_STAGES.includes(d.stage)) {
      wsData.push(Array(PIPELINE_HEADERS.length).fill(null)); // divider
      addedDivider = true;
    }

    const sym = currencySymbol(d.currency);
    const pricePerBed = d.asking_price && d.beds ? Math.round(d.asking_price / d.beds) : null;
    const tl = latestTimeline[d.id];
    const lastUpdateText = tl ? (tl.text.length > 60 ? tl.text.slice(0, 57) + '...' : tl.text) : '—';

    wsData.push([
      d.name || '—',
      stageLabel(d.stage),
      d.type || '—',
      d.country || '—',
      d.region || '—',
      d.beds ?? '—' as any,
      d.occupancy != null ? `${d.occupancy}%` : '—',
      d.tenure || '—',
      d.property_type || '—',
      d.asking_price != null ? fmtCurrency(d.asking_price, d.currency) : '—',
      pricePerBed != null ? fmtCurrency(pricePerBed, d.currency) : '—',
      '—', // EBITDARM not in schema
      d.ebitdar != null ? fmtCurrency(d.ebitdar, d.currency) : '—',
      d.ebitda != null ? fmtCurrency(d.ebitda, d.currency) : '—',
      d.cqc_rating || '—',
      d.operator || '—',
      d.landlord || '—',
      d.seller || '—',
      d.broker || '—',
      d.broker_firm || '—',
      d.solicitor_seller || '—',
      d.solicitor_buyer || '—',
      d.key_contact || '—',
      d.internal_lead || '—',
      d.next_step || '—',
      d.next_step_owner || '—',
      d.next_step_date ? fmtDate(d.next_step_date) : '—',
      d.risks || '—',
      d.notes || '—',
      lastUpdateText,
      fmtDate(d.updated_at),
    ]);
  }

  // Summary section
  wsData.push(Array(PIPELINE_HEADERS.length).fill(null));
  wsData.push(['PIPELINE SUMMARY', ...Array(PIPELINE_HEADERS.length - 1).fill(null)]);
  wsData.push(['Total Active Deals', active.length, ...Array(PIPELINE_HEADERS.length - 2).fill(null)]);
  wsData.push(['Total Beds', activeBeds, ...Array(PIPELINE_HEADERS.length - 2).fill(null)]);
  wsData.push(['Total Pipeline Value', formatCurrency(activeValue), ...Array(PIPELINE_HEADERS.length - 2).fill(null)]);

  const avgPricePerBed = activeBeds > 0
    ? Math.round(active.reduce((s, d) => s + (d.asking_price && d.beds ? d.asking_price : 0), 0) / active.reduce((s, d) => s + (d.asking_price && d.beds ? d.beds : 0), 0) || 0)
    : 0;
  wsData.push(['Average £/Bed', avgPricePerBed > 0 ? `£${avgPricePerBed.toLocaleString('en-GB')}` : '—', ...Array(PIPELINE_HEADERS.length - 2).fill(null)]);

  const bedsWithOcc = active.filter(d => d.occupancy != null && d.beds);
  const weightedOcc = bedsWithOcc.length > 0
    ? Math.round(bedsWithOcc.reduce((s, d) => s + (d.occupancy! * (d.beds || 1)), 0) / bedsWithOcc.reduce((s, d) => s + (d.beds || 1), 0))
    : null;
  wsData.push(['Average Occupancy', weightedOcc != null ? `${weightedOcc}%` : '—', ...Array(PIPELINE_HEADERS.length - 2).fill(null)]);

  // Stage breakdown
  wsData.push(['Deals by Stage', '', ...Array(PIPELINE_HEADERS.length - 2).fill(null)]);
  for (const stage of [...STAGE_ORDER, ...INACTIVE_STAGES]) {
    const count = deals.filter(d => d.stage === stage).length;
    if (count > 0) {
      wsData.push([`  ${stageLabel(stage)}`, count, ...Array(PIPELINE_HEADERS.length - 2).fill(null)]);
    }
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = COL_WIDTHS.map(w => ({ wch: w }));

  // Merge title row
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: PIPELINE_HEADERS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: PIPELINE_HEADERS.length - 1 } },
  ];

  // Freeze panes: freeze row 4 (header) and column A
  ws['!freeze'] = { xSplit: 1, ySplit: 4 };
  // SheetJS uses '!freeze' for xlsx-style but for community edition we need views
  if (!ws['!views']) ws['!views'] = [];
  (ws['!views'] as any[]).push({ state: 'frozen', xSplit: 1, ySplit: 4 });

  XLSX.utils.book_append_sheet(wb, ws, 'Pipeline');

  // Delegations sheet
  const delData: (string | number | null)[][] = [];
  delData.push(['OPEN DELEGATIONS', null, null, null, null]);
  delData.push([`Exported: ${exportDate}`, null, null, null, null]);
  delData.push([null, null, null, null, null]);
  delData.push(['Deal', 'Assignee', 'Task', 'Date', 'Status']);

  // Map deal IDs to names
  const dealMap = new Map(deals.map(d => [d.id, d.name]));

  // Sort delegations by deal name then date desc
  const sortedDels = [...delegations].sort((a, b) => {
    const na = dealMap.get(a.deal_id) || '';
    const nb = dealMap.get(b.deal_id) || '';
    if (na !== nb) return na.localeCompare(nb);
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  for (const del of sortedDels) {
    delData.push([
      dealMap.get(del.deal_id) || '—',
      del.assignee,
      del.task,
      fmtDate(del.date),
      del.done ? 'Done' : 'Open',
    ]);
  }

  const ws2 = XLSX.utils.aoa_to_sheet(delData);
  ws2['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 10 }];
  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Delegations');

  // Generate and download
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Deal_Pipeline_${dateStr}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
