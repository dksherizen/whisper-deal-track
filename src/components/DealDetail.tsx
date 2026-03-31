import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Deal, TimelineEntry, Delegation } from "@/lib/types";
import { ALL_STAGES, getStageLabel, formatCurrency } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Plus, Save, X } from "lucide-react";

interface DealDetailProps {
  deal: Deal;
  onBack: () => void;
  onUpdate: () => void;
}

const FIELD_GROUPS = [
  {
    title: 'Deal Identity',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'aliases', label: 'Aliases', type: 'text' },
      { key: 'type', label: 'Type', type: 'select', options: ['single', 'portfolio', 'platform', 'jv'] },
      { key: 'country', label: 'Country', type: 'select', options: ['UK', 'US', 'Other'] },
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
      { key: 'currency', label: 'Currency', type: 'select', options: ['GBP', 'USD'] },
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
    title: 'Status',
    fields: [
      { key: 'next_step', label: 'Next Step', type: 'text' },
      { key: 'next_step_owner', label: 'Next Step Owner', type: 'text' },
      { key: 'next_step_date', label: 'Target Date', type: 'date' },
      { key: 'risks', label: 'Risks', type: 'textarea' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export default function DealDetail({ deal, onBack, onUpdate }: DealDetailProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [newTimelineText, setNewTimelineText] = useState("");
  const [newDelAssignee, setNewDelAssignee] = useState("");
  const [newDelTask, setNewDelTask] = useState("");

  useEffect(() => {
    setForm({ ...deal });
    loadTimeline();
    loadDelegations();
  }, [deal.id]);

  const loadTimeline = async () => {
    const { data } = await supabase
      .from('timeline_entries')
      .select('*')
      .eq('deal_id', deal.id)
      .order('date', { ascending: false });
    setTimeline((data as TimelineEntry[]) || []);
  };

  const loadDelegations = async () => {
    const { data } = await supabase
      .from('delegations')
      .select('*')
      .eq('deal_id', deal.id)
      .order('date', { ascending: false });
    setDelegations((data as Delegation[]) || []);
  };

  const handleSave = async () => {
    const { id, created_at, updated_at, user_id, ...fields } = form;
    await supabase.from('deals').update(fields).eq('id', deal.id);
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    await supabase.from('deals').delete().eq('id', deal.id);
    onBack();
    onUpdate();
  };

  const toggleDelegation = async (id: string, done: boolean) => {
    await supabase.from('delegations').update({ done: !done }).eq('id', id);
    loadDelegations();
  };

  const addTimeline = async () => {
    if (!newTimelineText.trim()) return;
    await supabase.from('timeline_entries').insert({
      deal_id: deal.id,
      text: newTimelineText.trim(),
      source: 'manual',
    });
    setNewTimelineText("");
    loadTimeline();
  };

  const addDelegation = async () => {
    if (!newDelAssignee.trim() || !newDelTask.trim()) return;
    await supabase.from('delegations').insert({
      deal_id: deal.id,
      assignee: newDelAssignee.trim(),
      task: newDelTask.trim(),
    });
    setNewDelAssignee("");
    setNewDelTask("");
    loadDelegations();
  };

  const renderField = (field: any) => {
    const value = form[field.key];
    if (!editing) {
      if (field.type === 'number' && field.key.includes('price') || field.key === 'revenue' || field.key === 'ebitda' || field.key === 'ebitdar') {
        return <span className="text-sm">{formatCurrency(value, form.currency || 'GBP')}</span>;
      }
      return <span className="text-sm">{value || '—'}</span>;
    }

    if (field.type === 'select') {
      return (
        <Select value={value || ''} onValueChange={v => setForm({ ...form, [field.key]: v })}>
          <SelectTrigger className="h-7 text-xs bg-secondary border-border">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((o: string) => (
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
        value={value || ''}
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
        <h2 className="text-lg font-bold flex-1">{deal.name}</h2>
        <div className="flex items-center gap-1.5 mr-2">
          {editing ? (
            <Select value={form.stage || deal.stage} onValueChange={v => setForm({ ...form, stage: v })}>
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
            <span className="text-xs px-2 py-1 bg-secondary rounded">{getStageLabel(deal.stage)}</span>
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
                  <AlertDialogTitle>Delete {deal.name}?</AlertDialogTitle>
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

      {/* Content */}
      <div className="flex gap-0">
        {/* Left - fields */}
        <div className="flex-1 p-3 space-y-4 border-r border-border min-w-0">
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

        {/* Right - delegations & timeline */}
        <div className="w-80 shrink-0 p-3 space-y-4 overflow-y-auto">
          {/* Delegations */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delegations</h3>
            <div className="space-y-1.5">
              {delegations.map(d => (
                <div key={d.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={d.done}
                    onCheckedChange={() => toggleDelegation(d.id, d.done)}
                    className="mt-0.5"
                  />
                  <div className={d.done ? 'line-through text-muted-foreground' : ''}>
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
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</h3>
            <div className="space-y-2">
              {timeline.map(t => (
                <div key={t.id} className="text-sm">
                  <div className="text-2xs text-muted-foreground">{t.date} · {t.source}</div>
                  <div>{t.text}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              <Input value={newTimelineText} onChange={e => setNewTimelineText(e.target.value)} placeholder="Add timeline entry..." className="h-6 text-xs bg-secondary border-border" onKeyDown={e => e.key === 'Enter' && addTimeline()} />
              <Button size="icon" variant="ghost" onClick={addTimeline} className="h-6 w-6"><Plus className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
