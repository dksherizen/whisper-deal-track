import { useState, useEffect } from "react";
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

export function useDealChat(userId: string | null, deals: Deal[], refetchDeals: () => Promise<void>) {
  const [parsing, setParsing] = useState(false);

  const sendMessage = async (
    text: string,
    addMessage: (role: 'user' | 'assistant', text: string, isError?: boolean) => Promise<Message | undefined>,
    recentMessages: Message[]
  ) => {
    if (!userId) return;

    await addMessage('user', text);
    setParsing(true);

    try {
      const existingDeals = deals.map(d => ({
        name: d.name,
        stage: d.stage,
        broker: d.broker,
        key_contact: d.key_contact,
        aliases: d.aliases,
      }));

      const last5 = recentMessages.slice(-5).map(m => ({ role: m.role, text: m.text }));

      const { data, error } = await supabase.functions.invoke('parse-deal-input', {
        body: { message: text, existingDeals, recentMessages: last5 },
      });

      if (error) throw error;

      const result = data as ParseResult;

      if (result.command === 'status') {
        const statusText = buildStatusResponse(deals);
        await addMessage('assistant', statusText);
      } else if (result.command === 'query' && result.dealName) {
        const dealName = result.dealName.toUpperCase();
        const deal = deals.find(d =>
          d.name.toUpperCase() === dealName ||
          d.aliases?.toUpperCase().includes(dealName) ||
          dealName.includes(d.name.toUpperCase())
        );

        if (deal) {
          const { data: timeline } = await supabase
            .from('timeline_entries')
            .select('*')
            .eq('deal_id', deal.id)
            .order('date', { ascending: false })
            .limit(10);
          const { data: delegations } = await supabase
            .from('delegations')
            .select('*')
            .eq('deal_id', deal.id)
            .order('date', { ascending: false });

          const queryText = buildDealQueryResponse(deal, timeline || [], delegations || []);
          await addMessage('assistant', queryText);
        } else {
          await addMessage('assistant', `No deal found matching "${result.dealName}".`);
        }
      } else {
        // Process deals/contacts
        await processParsedResult(result, deals, userId);
        await refetchDeals();

        let responseText = '';
        if (result.summary) responseText += result.summary;
        if (result.question) responseText += '\n\n' + result.question;
        if (!responseText) responseText = 'Processed.';

        await addMessage('assistant', responseText);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      await addMessage('assistant', `Error: ${err.message || 'Failed to process message'}`, true);
    } finally {
      setParsing(false);
    }
  };

  return { sendMessage, parsing };
}
