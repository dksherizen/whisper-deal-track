export const STAGES = [
  { key: 'identified', label: 'Identified', color: 'stage-identified' },
  { key: 'initial_review', label: 'Initial Review', color: 'stage-initial-review' },
  { key: 'engaged', label: 'Engaged', color: 'stage-engaged' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'stage-due-diligence' },
  { key: 'hot_loi', label: 'HoT / LOI', color: 'stage-hot-loi' },
  { key: 'legal_closing', label: 'Legal / Closing', color: 'stage-legal-closing' },
] as const;

export const INACTIVE_STAGES = [
  { key: 'completed', label: 'Completed', color: 'stage-completed' },
  { key: 'on_hold', label: 'On Hold', color: 'stage-on-hold' },
  { key: 'dead', label: 'Dead', color: 'stage-dead' },
] as const;

export const ALL_STAGES = [...STAGES, ...INACTIVE_STAGES] as const;

export type StageKey = typeof ALL_STAGES[number]['key'];

export function getStageLabel(key: string): string {
  return ALL_STAGES.find(s => s.key === key)?.label ?? key;
}

export function getStageColor(key: string): string {
  return ALL_STAGES.find(s => s.key === key)?.color ?? 'muted';
}

export function formatCurrency(amount: number | null, currency: string = 'GBP'): string {
  if (amount == null) return '—';
  const sym = currency === 'GBP' ? '£' : '$';
  if (amount >= 1_000_000) return `${sym}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${sym}${(amount / 1_000).toFixed(0)}K`;
  return `${sym}${amount}`;
}

export function daysSinceUpdate(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
}
