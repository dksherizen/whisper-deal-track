import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeals, useMessages, useDealChat, useChats } from "@/hooks/use-deals";
import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/lib/types";
import AuthPage from "@/components/AuthPage";
import Header from "@/components/Header";
import ChatView from "@/components/ChatView";
import BoardView from "@/components/BoardView";
import ListView from "@/components/ListView";
import DealDetail from "@/components/DealDetail";

type ViewMode = 'chat' | 'board' | 'list';

export default function Index() {
  const { session, loading: authLoading, signIn, signUp, signOut, userId } = useAuth();
  const { deals, loading: dealsLoading, refetchDeals } = useDeals(userId);
  const { chats, loading: chatsLoading, createChat, deleteChat, updateChatTitle, fetchChats } = useChats(userId);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { messages, loading: msgsLoading, addMessage } = useMessages(userId, currentChatId);
  const { enqueue, parsing, queuedTexts, queueCount } = useDealChat(userId, deals, refetchDeals, addMessage, messages);

  const [view, setView] = useState<ViewMode>('chat');
  const [search, setSearch] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Auto-select or create first chat
  useEffect(() => {
    if (!userId || chatsLoading) return;
    if (chats.length > 0 && !currentChatId) {
      setCurrentChatId(chats[0].id);
    } else if (chats.length === 0 && !currentChatId) {
      createChat('New Chat').then(chat => {
        if (chat) setCurrentChatId(chat.id);
      });
    }
  }, [userId, chats, chatsLoading, currentChatId]);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  }

  if (!session) {
    return (
      <AuthPage
        onAuth={async (email, password, isSignUp) => {
          if (isSignUp) return signUp(email, password);
          return signIn(email, password);
        }}
      />
    );
  }

  const handleDeleteAllDeals = async () => {
    if (!userId) return;
    await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('deals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await refetchDeals();
  };

  const handleNewChat = async () => {
    const chat = await createChat('New Chat');
    if (chat) setCurrentChatId(chat.id);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    if (currentChatId === chatId) {
      // Switch to the next available chat or create new
      const remaining = chats.filter(c => c.id !== chatId);
      if (remaining.length > 0) {
        setCurrentChatId(remaining[0].id);
      } else {
        setCurrentChatId(null);
        const chat = await createChat('New Chat');
        if (chat) setCurrentChatId(chat.id);
      }
    }
  };

  const handleSend = (text: string) => {
    enqueue(text);
    fetchChats(); // refresh chat list to update title/timestamp
  };

  if (selectedDeal) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header
          deals={deals}
          view={view}
          setView={(v) => { setView(v); setSelectedDeal(null); }}
          search={search}
          setSearch={setSearch}
          onDeleteAllDeals={handleDeleteAllDeals}
          onSignOut={signOut}
        />
        <div className="flex-1 overflow-hidden">
          <DealDetail
            deal={selectedDeal}
            onBack={() => setSelectedDeal(null)}
            onUpdate={() => { refetchDeals(); }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        deals={deals}
        view={view}
        setView={setView}
        search={search}
        setSearch={setSearch}
        onDeleteAllDeals={handleDeleteAllDeals}
        onSignOut={signOut}
      />
      <div className="flex-1 overflow-hidden">
        {view === 'chat' && (
          <ChatView
            messages={messages}
            parsing={parsing}
            onSend={handleSend}
            queuedTexts={queuedTexts}
            queueCount={queueCount}
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={setCurrentChatId}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
          />
        )}
        {view === 'board' && (
          <BoardView deals={deals} search={search} onSelectDeal={setSelectedDeal} />
        )}
        {view === 'list' && (
          <ListView deals={deals} search={search} onSelectDeal={setSelectedDeal} />
        )}
      </div>
    </div>
  );
}
