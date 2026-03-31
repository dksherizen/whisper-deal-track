import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Deal, Message } from "@/lib/types";
import type { ParseResult } from "@/lib/types";
import { processParsedResult, buildStatusResponse, buildDealQueryResponse } from "@/lib/deal-processor";

export function useDeals(userId: string | null) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    setDeals((data as Deal[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDeals();
  }, [userId]);

  return { deals, loading, refetchDeals: fetchDeals };
}

export function useMessages(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const addMessage = async (role: 'user' | 'assistant', text: string, isError = false) => {
    if (!userId) return;
    const { data } = await supabase
      .from('messages')
      .insert({ role, text, is_error: isError, user_id: userId })
      .select()
      .single();
    if (data) {
      setMessages(prev => [...prev, data as Message]);
    }
    return data as Message;
  };

  return { messages, loading, addMessage, setMessages };
}

export function useDealChat(
  userId: string | null,
  deals: Deal[],
  refetchDeals: () => Promise<void>,
  addMessage: (role: 'user' | 'assistant', text: string, isError?: boolean) => Promise<Message | undefined>,
  messages: Message[]
) {
  const [queue, setQueue] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const dealsRef = useRef(deals);
  const messagesRef = useRef(messages);
  const addMessageRef = useRef(addMessage);
  const refetchRef = useRef(refetchDeals);

  useEffect(() => { dealsRef.current = deals; }, [deals]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { addMessageRef.current = addMessage; }, [addMessage]);
  useEffect(() => { refetchRef.current = refetchDeals; }, [refetchDeals]);

  const processOne = async (text: string) => {
    const add = addMessageRef.current;
    await add('user', text);

    try {
      const currentDeals = dealsRef.current;
      const existingDeals = currentDeals.map(d => ({
        name: d.name, stage: d.stage, broker: d.broker,
        key_contact: d.key_contact, aliases: d.aliases,
      }));
      const recent = messagesRef.current.filter(m => !m.is_error).slice(-6).map(m => ({ role: m.role, text: m.text }));

      const { data, error } = await supabase.functions.invoke('parse-deal-input', {
        body: { message: text, existingDeals, recentMessages: recent },
      });
      if (error) throw error;

      const result = data as ParseResult;

      if (result.command === 'status') {
        const statusText = buildStatusResponse(currentDeals);
        await add('assistant', statusText);
      } else if (result.command === 'query' && result.dealName) {
        const dealName = result.dealName.toUpperCase();
        const deal = currentDeals.find(d =>
          d.name.toUpperCase() === dealName ||
          d.aliases?.toUpperCase().includes(dealName) ||
          dealName.includes(d.name.toUpperCase())
        );
        if (deal) {
          const { data: timeline } = await supabase.from('timeline_entries').select('*').eq('deal_id', deal.id).order('date', { ascending: false }).limit(10);
          const { data: delegations } = await supabase.from('delegations').select('*').eq('deal_id', deal.id).order('date', { ascending: false });
          await add('assistant', buildDealQueryResponse(deal, timeline || [], delegations || []));
        } else {
          await add('assistant', `No deal found matching "${result.dealName}".`);
        }
      } else {
        await processParsedResult(result, currentDeals, userId!);
        await refetchRef.current();
        let responseText = '';
        if (result.summary) responseText += result.summary;
        if (result.question) responseText += '\n\n' + result.question;
        if (!responseText) responseText = 'Processed.';
        await add('assistant', responseText);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      await add('assistant', `Error: ${err.message || 'Failed to process message'}`, true);
    }
  };

  useEffect(() => {
    if (processing || queue.length === 0) return;

    const run = async () => {
      setProcessing(true);
      const [next, ...rest] = queue;
      setQueue(rest);
      await processOne(next);
      await refetchRef.current();
      setProcessing(false);
    };
    run();
  }, [queue, processing]);

  const enqueue = (text: string) => {
    setQueue(prev => [...prev, text]);
  };

  return {
    enqueue,
    parsing: processing,
    queuedTexts: queue,
    queueCount: queue.length,
  };
}
