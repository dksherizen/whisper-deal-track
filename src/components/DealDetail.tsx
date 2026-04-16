import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Deal, TimelineEntry, Delegation } from "@/lib/types";
import { ALL_STAGES, getStageLabel, formatCurrency } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Plus, Save, X, MessageSquare, CheckSquare, Clock, RefreshCw } from "lucide-react";

interface DealDetailProps {
  deal?: Deal | null;
  onBack: () => void;
  onUpdate: () => void;
  onChatAction?: (text: string) => void;
}

const MONEY_FIELDS = ['asking_price', 'revenue', 'ebitda', 'ebitdar'];

const FIELD_GROUPS = [
  {
    title: 'Deal Identity',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'aliases', label: 'Aliases', type: 'text' },
      { key: 'type', label: 'Type', type: 'select', options: ['single', 'portfolio', 'platform', 'jv'] },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'region', label: 'Region', type: 'text' },
    ],
  },
  {
    title: 'Property',
    fields: [
      { key: 'property_type', label: 'Property Type', type: 'select', options: ['care_home', 'nursing_home', 'assisted_living', 'residential', 'mixed', 'other'] },
      { key: 'beds', label: 'Beds', type: 'number' },
      { key: 'tenure', label: 'Tenure', type: 'select', options: ['freehold', 'leasehold', 'mixed'] },
      { key: 'occupancy', label: 'Occupancy %', type: 'number' },
      { key: 'condition', label: 'Condition', type: 'text' },
      { key: 'operator', label: 'Operator', type: 'text' },
      { key: 'landlord', label: 'Landlord', type: 'text' },
    ],
  },
  {
    title: 'Financials',
    fields: [
      { key: 'currency', label: 'Currency', type: 'select', options: ['GBP', 'USD', 'EUR'] },
      { key: 'asking_price', label: 'Asking Price', type: 'number' },
      { key: 'revenue', label: 'Revenue', type: 'number' },
      { key: 'ebitda', label: 'EBITDA', type: 'number' },
      { key: 'ebitdar', label: 'EBITDAR', type: 'number' },
      { key: 'rent_coverage', label: 'Rent Coverage', type: 'number' },
    ],
  },
  {
    title: 'Regulatory',
    fields: [
      { key: 'cqc_rating', label: 'CQC Rating', type: 'text' },
      { key: 'regulatory_notes', label: 'Regulatory Notes', type: 'textarea' },
    ],
  },
  {
    title: 'People',
    fields: [
      { key: 'seller', label: 'Seller', type: 'text' },
      { key: 'broker', label: 'Broker', type: 'text' },
      { key: 'broker_firm', label: 'Broker Firm', type: 'text' },
      { key: 'solicitor_seller', label: 'Solicitor (Seller)', type: 'text' },
      { key: 'solicitor_buyer', label: 'Solicitor (Buyer)', type: 'text' },
      { key: 'key_contact', label: 'Key Contact', type: 'text' },
      { key: 'internal_lead', label: 'Internal Lead', type: 'text' },
      { key: 'partner', label: 'Partner', type: 'text' },
    ],
  },
  {
    title: 'Status & Next Steps',
    fields: [
      { key: 'next_step', label: 'Next Step', type: 'text' },
      { key: 'next_step_owner', label: 'Next Step Owner', type: 'text' },
      { key: 'next_step_date', label: 'Target Date', type: 'date' },
      { key: 'risks', label: 'Risks', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export default function DealDetail({ deal, onBack, onUpdate, onChatAction }: DealDetailProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [newTimelineText, setNewTimelineText] = useState("");
  const [newDelAssignee, setNewDelAssignee] = useState("");
  const [newDelTask, setNewDelTask] = useState("");

  useEffect(() => {
    if (deal) {
      setForm({ ...deal });
      loadTimeline();
      loadDelegations();
    }
  }, [deal?.id]);

  const loadTimeline = async () => {
    if (!deal) return;
    const { data } = await supabase
      .from('timeline_entries')
      .select('*')
      .eq('deal_id', deal.id)
      .order('date', { ascending: false });
    setTimeline((data as TimelineEntry[]) || []);
  };

  const loadDelegations = async () => {
    if (!deal) return;
    const { data } = await supabase
      .from('delegations')
      .select('*')
      .eq('deal_id', deal.id)
      .order('date', { ascending: false });
    setDelegations((data as Delegation[]) || []);
  };

  const handleSave = async () => {
    if (!deal) return;
    const { id, created_at, updated_at, user_id, ...fields } = form;
    await supabase.from('deals').update(fields as any).eq('id', deal.id);
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!deal) return;
    await supabase.from('deals').delete().eq('id', deal.id);
    onBack();
    onUpdate();
  };

  const toggleDelegation = async (id: string, done: boolean) => {
    await supabase.from('delegations').update({ done: !done }).eq('id', id);
    loadDelegations();
  };

  const addTimeline = async () => {
    if (!newTimelineText.trim() || !deal) return;
    await supabase.from('timeline_entries').insert({
      deal_id: deal.id,
      text: newTimelineText.trim(),
      source: 'manual',
    });
    setNewTimelineText("");
    loadTimeline();
  };

  const addDelegation = async () => {
    if (!newDelAssignee.trim() || !newDelTask.trim() || !deal) return;
    await supabase.from('delegations').insert({
      deal_id: deal.id,
      assignee: newDelAssignee.trim(),
      task: newDelTask.trim(),
    });
    setNewDelAssignee("");
    setNewDelTask("");
    loadDelegations();
  };

  const renderField = (field: { key: string; label: string; type: string; options?: string[] }) => {
    const value = form[field.key];

    if (!editing) {
      if (MONEY_FIELDS.includes(field.key)) {
        return <span className="text-sm text-foreground">{formatCurrency(value, form.currency || 'GBP')}</span>;
      }
      const display = value != null && value !== '' ? String(value) : null;
      return <span className={`text-sm ${display ? 'text-foreground' : 'text-muted-foreground'}`}>{display || '—'}</span>;
    }

    if (field.type === 'select') {
      return (
        <Select value={value || ''} onValueChange={v => setForm({ ...form, [field.key]: v })}>
          <SelectTrigger className="h-7 text-xs bg-secondary border-border">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((o: string) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === 'textarea') {
      return (
        <Textarea
          value={value || ''}
          onChange={e => setForm({ ...form, [field.key]: e.target.value })}
          className="text-xs bg-secondary border-border min-h-[60px]"
        />
      );
    }
    return (
      <Input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value ?? ''}
        onChange={e => setForm({ ...form, [field.key]: field.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value })}
        className="h-7 text-xs bg-secondary border-border"
      />
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-7 w-7">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-bold flex-1">{deal?.name || ''}</h2>
        <div className="flex items-center gap-1.5 mr-2">
          {editing ? (
            <Select value={form.stage || 'identified'} onValueChange={v => setForm({ ...form, stage: v })}>
              <SelectTrigger className="h-7 text-xs w-36 bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STAGES.map(s => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs px-2 py-1 bg-secondary rounded">{getStageLabel(deal?.stage || 'identified')}</span>
          )}
        </div>
        {editing ? (
          <>
            <Button size="sm" onClick={handleSave} className="h-7 text-xs gap-1"><Save className="h-3 w-3" />Save</Button>
            <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setForm({ ...deal }); }} className="h-7 text-xs gap-1"><X className="h-3 w-3" />Cancel</Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-7 text-xs gap-1"><Pencil className="h-3 w-3" />Edit</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {deal?.name}?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this deal and all related data.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {/* Deal-specific quick actions */}
      {onChatAction && !editing && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50">
          <Button
            variant="outline" size="sm" className="h-6 text-[11px] gap-1"
            onClick={() => onChatAction(`Update on ${deal?.name}: `)}
          >
            <RefreshCw className="h-3 w-3" /> Update
          </Button>
          <Button
            variant="outline" size="sm" className="h-6 text-[11px] gap-1"
            onClick={() => onChatAction(`[INTERVIEW MODE] The user wants to be interviewed about an existing deal called ${deal?.name}. Review the existing data and ask about missing fields or gaps. Ask ONE question at a time.`)}
          >
            <MessageSquare className="h-3 w-3" /> Interview
          </Button>
          <Button
            variant="outline" size="sm" className="h-6 text-[11px] gap-1"
            onClick={() => onChatAction(`show me all delegations on ${deal?.name}`)}
          >
            <CheckSquare className="h-3 w-3" /> Delegations
          </Button>
          <Button
            variant="outline" size="sm" className="h-6 text-[11px] gap-1"
            onClick={() => {
              document.getElementById('timeline-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Clock className="h-3 w-3" /> Timeline
          </Button>
        </div>
      )}

      {/* Content — 70/30 split */}
      <div className="flex">
        {/* Left — fields (70%) */}
        <div className="w-[70%] p-4 space-y-5 border-r border-border min-w-0">
          {FIELD_GROUPS.map(group => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group.title}</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {group.fields.map(field => (
                  <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="text-2xs text-muted-foreground">{field.label}</label>
                    <div className="mt-0.5">{renderField(field)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right — delegations & timeline (30%) */}
        <div className="w-[30%] shrink-0 p-4 space-y-5 overflow-y-auto">
          {/* Delegations */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delegations</h3>
            <div className="space-y-2">
              {delegations.length === 0 && (
                <p className="text-2xs text-muted-foreground">No delegations yet.</p>
              )}
              {delegations.map(d => (
                <div key={d.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={d.done}
                    onCheckedChange={() => toggleDelegation(d.id, d.done)}
                    className="mt-0.5"
                  />
                  <div className={d.done ? 'line-through text-muted-foreground' : 'text-foreground'}>
                    <span className="font-medium">{d.assignee}:</span> {d.task}
                    <div className="text-2xs text-muted-foreground">{d.date}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                <Input value={newDelAssignee} onChange={e => setNewDelAssignee(e.target.value)} placeholder="Who" className="h-6 text-xs bg-secondary border-border" />
                <Input value={newDelTask} onChange={e => setNewDelTask(e.target.value)} placeholder="Task" className="h-6 text-xs bg-secondary border-border flex-1" />
                <Button size="icon" variant="ghost" onClick={addDelegation} className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div id="timeline-section">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</h3>
            <div className="space-y-2.5">
              {timeline.length === 0 && (
                <p className="text-2xs text-muted-foreground">No timeline entries yet.</p>
              )}
              {timeline.map(t => (
                <div key={t.id} className="flex gap-2 text-sm">
                  <span className="text-2xs text-muted-foreground whitespace-nowrap pt-0.5">{t.date}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{t.text}</span>
                      {t.source === 'ai' && (
                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 shrink-0">ai</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              <Input
                value={newTimelineText}
                onChange={e => setNewTimelineText(e.target.value)}
                placeholder="Add timeline entry..."
                className="h-6 text-xs bg-secondary border-border"
                onKeyDown={e => e.key === 'Enter' && addTimeline()}
              />
              <Button size="icon" variant="ghost" onClick={addTimeline} className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}