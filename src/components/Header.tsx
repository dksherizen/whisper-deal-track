import { useMemo } from "react";
import type { Deal } from "@/lib/types";
import { formatCurrency } from "@/lib/constants";
import { Search, Settings, Trash2, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = 'chat' | 'board' | 'list';

interface HeaderProps {
  deals: Deal[];
  view: ViewMode;
  setView: (v: ViewMode) => void;
  search: string;
  setSearch: (s: string) => void;
  onDeleteAllDeals: () => void;
  onSignOut: () => void;
  onNewDeal?: () => void;
  onInsertTestDeal?: () => void;
  onExport?: () => void;
}

export default function Header({ deals, view, setView, search, setSearch, onDeleteAllDeals, onSignOut, onNewDeal, onInsertTestDeal, onExport }: HeaderProps) {
  const stats = useMemo(() => {
    const active = deals.filter(d => !['completed', 'on_hold', 'dead'].includes(d.stage));
    const totalBeds = active.reduce((sum, d) => sum + (d.beds || 0), 0);
    const totalValue = active.reduce((sum, d) => sum + (d.asking_price || 0), 0);
    const stale = active.filter(d => {
      const days = Math.floor((Date.now() - new Date(d.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      return days >= 14;
    }).length;
    return { active: active.length, totalBeds, totalValue, stale };
  }, [deals]);

  return (
    <header className="h-11 border-b border-border bg-card flex items-center px-3 gap-3 shrink-0">
      <h1 className="text-lg font-bold text-foreground tracking-tight whitespace-nowrap">Deal Tracker</h1>

      <div className="flex items-center gap-2 text-2xs text-muted-foreground whitespace-nowrap">
        <span>{stats.active} active</span>
        <span>·</span>
        <span>{stats.totalBeds} beds</span>
        <span>·</span>
        <span>{formatCurrency(stats.totalValue)} pipeline</span>
        {stats.stale > 0 && (
          <>
            <span>·</span>
            <span className="text-warning">⚠ {stats.stale} stale</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {onNewDeal && (
        <Button variant="outline" size="sm" onClick={onNewDeal} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" /> New Deal
        </Button>
      )}

      <div className="flex items-center bg-secondary rounded-md p-0.5 gap-0.5">
        {(['chat', 'board', 'list'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-xs rounded-sm transition-colors ${
              view === v
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {view !== 'chat' && (
        <div className="relative w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search deals..."
            className="h-7 pl-7 text-xs bg-secondary border-0"
          />
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border-border">
          {onInsertTestDeal && (
            <DropdownMenuItem onClick={onInsertTestDeal} className="text-xs gap-2">
              <Plus className="h-3 w-3" />
              Insert Test Deal
            </DropdownMenuItem>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive text-xs gap-2">
                <Trash2 className="h-3 w-3" />
                Delete All Deals
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete ALL deals?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all deals, timeline entries, delegations, and contacts. Chat history will be preserved. This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteAllDeals} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Everything</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <DropdownMenuItem onClick={onSignOut} className="text-xs">Sign Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
