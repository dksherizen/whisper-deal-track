import { useMemo, useState } from "react";
import type { Deal } from "@/lib/types";
import { STAGES, INACTIVE_STAGES, getStageColor, formatCurrency, daysSinceUpdate } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

interface BoardViewProps {
  deals: Deal[];
  search: string;
  onSelectDeal: (deal: Deal) => void;
}

const ALWAYS_SHOW = ['identified', 'engaged'];

function stageColorVar(stageKey: string): string {
  const color = getStageColor(stageKey);
  // color is like "stage-identified" → CSS var is "--stage-identified"
  return `hsl(var(--${color}))`;
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const stale = daysSinceUpdate(deal.updated_at);

  return (
    <div
      onClick={onClick}
      className={`bg-card rounded-md p-2.5 cursor-pointer hover:border-primary/30 transition-colors border-l-[3px] ${
        stale >= 14 ? 'border border-warning/30' : 'border border-border'
      }`}
      style={{ borderLeftColor: stageColorVar(deal.stage) }}
    >
      <div className="font-semibold text-sm text-foreground truncate">{deal.name}</div>
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
  );
}

export default function BoardView({ deals, search, onSelectDeal }: BoardViewProps) {
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

  // Active deals (not dead/completed/on_hold)
  const inactiveKeys = INACTIVE_STAGES.map(s => s.key as string);
  const activeDeals = filtered.filter(d => !inactiveKeys.includes(d.stage));
  const inactiveDeals = filtered.filter(d => inactiveKeys.includes(d.stage));

  // Only show columns that have deals OR are in ALWAYS_SHOW
  const visibleStages = STAGES.filter(stage => {
    if (ALWAYS_SHOW.includes(stage.key)) return true;
    return activeDeals.some(d => d.stage === stage.key);
  });

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
                    <DealCard key={deal.id} deal={deal} onClick={() => onSelectDeal(deal)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Inactive section — collapsed by default */}
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
