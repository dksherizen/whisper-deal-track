import { useMemo } from "react";
import type { Deal } from "@/lib/types";
import { getStageLabel, formatCurrency, daysSinceUpdate } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface ListViewProps {
  deals: Deal[];
  search: string;
  onSelectDeal: (deal: Deal) => void;
  onNewDeal?: () => void;
}

const STAGE_ORDER = ['legal_closing', 'hot_loi', 'due_diligence', 'engaged', 'initial_review', 'identified', 'completed', 'on_hold', 'dead'];

export default function ListView({ deals, search, onSelectDeal, onNewDeal }: ListViewProps) {
  const filtered = useMemo(() => {
    let d = deals;
    if (search) {
      const q = search.toLowerCase();
      d = d.filter(deal =>
        deal.name.toLowerCase().includes(q) ||
        deal.region?.toLowerCase().includes(q) ||
        deal.broker?.toLowerCase().includes(q)
      );
    }
    return d.sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  }, [deals, search]);

  return (
    <div className="h-full overflow-auto p-3">
      {onNewDeal && (
        <div className="mb-2">
          <Button variant="outline" size="sm" onClick={onNewDeal} className="h-7 text-xs gap-1">
            <Plus className="h-3 w-3" /> New Deal
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-2xs">Deal</TableHead>
            <TableHead className="text-2xs">Location</TableHead>
            <TableHead className="text-2xs">Beds</TableHead>
            <TableHead className="text-2xs">Price</TableHead>
            <TableHead className="text-2xs">Stage</TableHead>
            <TableHead className="text-2xs">Next Step</TableHead>
            <TableHead className="text-2xs">Updated</TableHead>
            <TableHead className="text-2xs">Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(deal => {
            const stale = daysSinceUpdate(deal.updated_at);
            return (
              <TableRow
                key={deal.id}
                onClick={() => onSelectDeal(deal)}
                className={`cursor-pointer border-border ${stale >= 14 ? 'bg-warning/5' : ''}`}
              >
                <TableCell className="font-medium text-sm">{deal.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{deal.region || '—'}</TableCell>
                <TableCell className="text-sm">{deal.beds || '—'}</TableCell>
                <TableCell className="text-sm">{formatCurrency(deal.asking_price, deal.currency || 'GBP')}</TableCell>
                <TableCell className="text-sm">{getStageLabel(deal.stage)}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{deal.next_step || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(deal.updated_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {stale >= 14 && <span className="text-2xs text-warning">⚠ {stale}d</span>}
                    {deal.risks && <span className="text-2xs text-destructive">⚠</span>}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
