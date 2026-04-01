import { useMemo, useState } from "react";
import type { Deal } from "@/lib/types";
import { STAGES, INACTIVE_STAGES, ALL_STAGES, getStageColor, getStageLabel, formatCurrency, daysSinceUpdate } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface BoardViewProps {
  deals: Deal[];
  search: string;
  onSelectDeal: (deal: Deal) => void;
  onEditDeal?: (deal: Deal) => void;
  onNewDeal?: () => void;
  onRefetch?: () => void;
}

const ALWAYS_SHOW = ['identified', 'engaged'];

function stageColorVar(stageKey: string): string {
  const color = getStageColor(stageKey);
  return `hsl(var(--${color}))`;
}

function DealCard({ deal, onClick, onEdit, onStageChange, onDelete }: {
  deal: Deal;
  onClick: () => void;
  onEdit?: () => void;
  onStageChange?: (stage: string) => void;
  onDelete?: () => void;
}) {
  const stale = daysSinceUpdate(deal.updated_at);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      className={`group relative bg-card rounded-md p-2.5 cursor-pointer hover:border-primary/30 transition-colors border-l-[3px] ${
        stale >= 14 ? 'border border-warning/30' : 'border border-border'
      }`}
      style={{ borderLeftColor: stageColorVar(deal.stage) }}
    >
      {/* Card actions — top right */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Edit deal"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
        {onDelete && (
          <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
            <AlertDialogTrigger asChild>
              <button
                onClick={e => { e.stopPropagation(); setShowDelete(true); }}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-destructive"
                title="Delete deal"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border" onClick={e => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {deal.name}?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete this deal and all related data.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setShowDelete(false); onDelete(); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div onClick={onClick}>
        <div className="font-semibold text-sm text-foreground truncate pr-12">{deal.name}</div>
        {deal.region && (
          <div className="text-2xs text-muted-foreground mt-0.5">{deal.region}{deal.country ? `, ${deal.country}` : ''}</div>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {deal.beds && (
            <span className="text-2xs px-1.5 py-0.5 bg-secondary rounded">{deal.beds} beds</span>
          )}
          {deal.asking_price && (
            <span className="text-2xs px-1.5 py-0.5 bg-secondary rounded">{formatCurrency(deal.asking_price, deal.currency || 'GBP')}</span>
          )}
          {deal.tenure && (
            <span className="text-2xs px-1.5 py-0.5 bg-secondary rounded">{deal.tenure}</span>
          )}
        </div>
        {deal.next_step && (
          <div className="text-2xs text-muted-foreground mt-1.5 truncate">→ {deal.next_step}</div>
        )}
        <div className="flex gap-2 mt-1.5">
          {stale >= 14 && (
            <span className="text-2xs text-warning">⚠ {stale}d stale</span>
          )}
          {deal.risks && (
            <span className="text-2xs text-destructive">⚠ flagged</span>
          )}
        </div>
      </div>

      {/* Inline stage change */}
      {onStageChange && (
        <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <Select value={deal.stage} onValueChange={onStageChange}>
            <SelectTrigger className="h-5 text-[10px] bg-secondary/50 border-0 px-1.5 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STAGES.map(s => (
                <SelectItem key={s.key} value={s.key} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default function BoardView({ deals, search, onSelectDeal, onEditDeal, onNewDeal, onRefetch }: BoardViewProps) {
  const [showInactive, setShowInactive] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return deals;
    const q = search.toLowerCase();
    return deals.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.region?.toLowerCase().includes(q) ||
      d.broker?.toLowerCase().includes(q)
    );
  }, [deals, search]);

  const inactiveKeys = INACTIVE_STAGES.map(s => s.key as string);
  const activeDeals = filtered.filter(d => !inactiveKeys.includes(d.stage));
  const inactiveDeals = filtered.filter(d => inactiveKeys.includes(d.stage));

  const visibleStages = STAGES.filter(stage => {
    if (ALWAYS_SHOW.includes(stage.key)) return true;
    return activeDeals.some(d => d.stage === stage.key);
  });

  const handleStageChange = async (dealId: string, newStage: string) => {
    await supabase.from('deals').update({ stage: newStage, updated_at: new Date().toISOString() }).eq('id', dealId);
    onRefetch?.();
  };

  const handleDelete = async (dealId: string) => {
    await supabase.from('deals').delete().eq('id', dealId);
    onRefetch?.();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-x-auto p-3">
        <div className="flex gap-2 min-w-max h-full">
          {visibleStages.map(stage => {
            const stageDeals = activeDeals.filter(d => d.stage === stage.key);
            return (
              <div key={stage.key} className="w-56 flex flex-col shrink-0">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColorVar(stage.key) }} />
                  <span className="text-xs font-medium text-foreground">{stage.label}</span>
                  <Badge variant="secondary" className="text-2xs h-4 px-1.5 min-w-[1.25rem] justify-center">
                    {stageDeals.length}
                  </Badge>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5">
                  {stageDeals.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => onSelectDeal(deal)}
                      onEdit={onEditDeal ? () => onEditDeal(deal) : undefined}
                      onStageChange={(s) => handleStageChange(deal.id, s)}
                      onDelete={() => handleDelete(deal.id)}
                    />
                  ))}
                </div>
                {onNewDeal && (
                  <button
                    onClick={() => onNewDeal(stage.key)}
                    className="flex items-center justify-center gap-1 mt-1.5 py-1.5 text-2xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {inactiveDeals.length > 0 && (
        <div className="border-t border-border p-3">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            {showInactive ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Dead & Completed ({inactiveDeals.length})
          </button>
          {showInactive && (
            <div className="flex gap-4 mt-2 opacity-60">
              {INACTIVE_STAGES.map(stage => {
                const stageDeals = inactiveDeals.filter(d => d.stage === stage.key);
                if (stageDeals.length === 0) return null;
                return (
                  <div key={stage.key}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColorVar(stage.key) }} />
                      <span className="text-xs text-muted-foreground">{stage.label} ({stageDeals.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stageDeals.map(deal => (
                        <button
                          key={deal.id}
                          onClick={() => onSelectDeal(deal)}
                          className="text-2xs px-2 py-1 bg-secondary rounded hover:bg-accent transition-colors"
                        >
                          {deal.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
