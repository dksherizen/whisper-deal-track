import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Deal, Message, Chat } from "@/lib/types";
import type { ParseResult } from "@/lib/types";
import { processParsedResult, buildStatusResponse, buildDealQueryResponse, buildDelegationsResponse } from "@/lib/deal-processor";

export function useDeals(userId: string | null) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeals = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('deals')
      .select('*')
      .order('updated_at', { ascending: false });
    setDeals((data as Deal[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDeals();
  }, [userId]);

  return { deals, loading, refetchDeals: fetchDeals };
}

export function useChats(userId: string | null) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    setChats((data as Chat[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const createChat = async (title = 'New Chat') => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('chats')
      .insert({ title, user_id: userId })
      .select()
      .single();
    if (error || !data) return null;
    setChats(prev => [data as Chat, ...prev]);
    return data as Chat;
  };

  const deleteChat = async (chatId: string) => {
    await supabase.from('chats').delete().eq('id', chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
  };

  const updateChatTitle = async (chatId: string, title: string) => {
    await supabase.from('chats').update({ title }).eq('id', chatId);
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title } : c));
  };

  return { chats, loading, fetchChats, createChat, deleteChat, updateChatTitle };
}

export function useMessages(userId: string | null, chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      setMessages((data as Message[]) || []);
      setLoading(false);
    };
    load();
  }, [userId, chatId]);

  const addMessage = async (role: 'user' | 'assistant', text: string, isError = false) => {
    if (!userId || !chatId) return;
    const { data } = await supabase
      .from('messages')
      .insert({ role, text, is_error: isError, user_id: userId, chat_id: chatId })
      .select()
      .single();
    if (data) {
      setMessages(prev => [...prev, data as Message]);
    }
    if (role === 'user') {
      const isFirst = messages.length === 0;
      if (isFirst) {
        const title = text.length > 50 ? text.slice(0, 47) + '...' : text;
        await supabase.from('chats').update({ title, updated_at: new Date().toISOString() }).eq('id', chatId);
      } else {
        await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
      }
    }
    return data as Message;
  };

  return { messages, loading, addMessage, setMessages };
}

function countPossibleDealNames(text: string): number {
  const matches = text.match(/\b[A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)*\b/g) || [];
  const unique = new Set(matches.filter(m => m.length > 3));
  return unique.size;
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

      // Handle plain text response (interview mode)
      if (result.text && !result.deals && !result.command) {
        await add('assistant', result.text);
        return;
      }

      if (result.command === 'status') {
        const statusText = buildStatusResponse(currentDeals);
        await add('assistant', statusText);
      } else if (result.command === 'delegations') {
        const delText = await buildDelegationsResponse();
        await add('assistant', delText);
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
        try {
          await processParsedResult(result, currentDeals, userId!);
          await refetchRef.current();
          let responseText = '';
          if (result.summary) responseText += result.summary;
          if (result.question) responseText += '\n\n' + result.question;
          if (!responseText) responseText = 'Processed.';

          const possibleNames = countPossibleDealNames(text);
          const returnedDeals = result.deals?.length || 0;
          if (possibleNames > returnedDeals + 1 && possibleNames > 2) {
            responseText += "\n\n⚠ I may have missed some deals in that dump. Try sending updates for specific deals separately if something's missing.";
          }

          await add('assistant', responseText);
        } catch (saveErr: any) {
          console.error('DB save error:', saveErr);
          let responseText = '';
          if (result.summary) responseText += result.summary;
          if (result.question) responseText += '\n\n' + result.question;
          responseText += '\n\n⚠ Parsed successfully but couldn\'t save to database. Try refreshing.';
          await add('assistant', responseText, true);
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const msg = err.message || '';
      if (msg.includes('parse') || msg.includes('JSON')) {
        await add('assistant', "Couldn't parse that. Try rephrasing?", true);
      } else {
        await add('assistant', 'Something went wrong. Try again.', true);
      }
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
