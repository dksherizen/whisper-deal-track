import { useMemo } from "react";
import type { Deal } from "@/lib/types";
import { STAGES, INACTIVE_STAGES, getStageColor, formatCurrency, daysSinceUpdate } from "@/lib/constants";

interface BoardViewProps {
  deals: Deal[];
  search: string;
  onSelectDeal: (deal: Deal) => void;
}

function DealCard({ deal, onClick }: { deal: Deal; onClick: () => void }) {
  const stale = daysSinceUpdate(deal.updated_at);
  const colorClass = getStageColor(deal.stage);

  return (
    <div
      onClick={onClick}
      className={`bg-card border border-border rounded-md p-2.5 cursor-pointer hover:border-primary/30 transition-colors border-l-2`}
      style={{ borderLeftColor: `var(--tw-${colorClass})` }}
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
  const filtered = useMemo(() => {
    if (!search) return deals;
    const q = search.toLowerCase();
    return deals.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.region?.toLowerCase().includes(q) ||
      d.broker?.toLowerCase().includes(q)
    );
  }, [deals, search]);

  const activeStages = STAGES;
  const inactiveStages = INACTIVE_STAGES;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-x-auto p-3">
        <div className="flex gap-2 min-w-max h-full">
          {activeStages.map(stage => {
            const stageDeals = filtered.filter(d => d.stage === stage.key);
            return (
              <div key={stage.key} className="w-56 flex flex-col shrink-0">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <div className={`w-2 h-2 rounded-full bg-${stage.color}`} />
                  <span className="text-xs font-medium text-foreground">{stage.label}</span>
                  <span className="text-2xs text-muted-foreground">({stageDeals.length})</span>
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

      {/* Inactive stages row */}
      <div className="border-t border-border p-3">
        <div className="flex gap-4">
          {inactiveStages.map(stage => {
            const stageDeals = filtered.filter(d => d.stage === stage.key);
            if (stageDeals.length === 0) return null;
            return (
              <div key={stage.key} className="opacity-60">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-2 h-2 rounded-full bg-${stage.color}`} />
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
      </div>
    </div>
  );
}
