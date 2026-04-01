import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeals, useMessages, useDealChat, useChats } from "@/hooks/use-deals";
import { supabase } from "@/integrations/supabase/client";
import type { Deal } from "@/lib/types";
import { exportPipeline } from "@/lib/export-pipeline";
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
  const { chats, loading: chatsLoading, initialChatId, createChat, deleteChat, updateChatTitle, fetchChats } = useChats(userId);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const { messages, loading: msgsLoading, addMessage } = useMessages(userId, currentChatId);
  const { enqueue, parsing, queuedTexts, queueCount } = useDealChat(userId, deals, refetchDeals, addMessage, messages);

  const [view, setView] = useState<ViewMode>('chat');
  const [search, setSearch] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [pendingChatInput, setPendingChatInput] = useState<string | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  // Set current chat from hook's initialChatId once available
  useEffect(() => {
    if (initialChatId && !currentChatId) {
      setCurrentChatId(initialChatId);
    }
  }, [initialChatId]);

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

  const handleInsertTestDeal = async () => {
    if (!userId) return;
    const payload = { name: `TEST ${new Date().toLocaleTimeString()}`, stage: 'identified', user_id: userId };
    console.log('Attempting minimum test deal insert:', payload);
    const { data, error } = await supabase.from('deals').insert(payload).select().single();
    if (error) { console.error('Minimum test deal insert failed:', error); return; }
    console.log('Minimum test deal insert succeeded:', data);
    await refetchDeals();
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    if (currentChatId === chatId) {
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
    fetchChats();
  };

  const handleDealChatAction = (text: string) => {
    if (text.endsWith(': ')) {
      setPendingChatInput(text);
      setSelectedDeal(null);
      setEditingDeal(null);
      setView('chat');
    } else {
      setSelectedDeal(null);
      setEditingDeal(null);
      setView('chat');
      handleSend(text);
    }
  };

  const handleNewDeal = () => {
    // Switch to chat and auto-send interview mode message
    setSelectedDeal(null);
    setEditingDeal(null);
    setView('chat');
    handleSend("[INTERVIEW MODE] The user wants to be interviewed about a new deal. Ask them ONE question at a time to build a complete deal record. Start with: What's the deal? Give me a name and location.");
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setSelectedDeal(null);
  };

  // Show deal in edit mode
  if (editingDeal) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header
          deals={deals} view={view}
          setView={(v) => { setView(v); setEditingDeal(null); }}
          search={search} setSearch={setSearch}
          onDeleteAllDeals={handleDeleteAllDeals} onSignOut={signOut}
          onNewDeal={handleNewDeal}
          onInsertTestDeal={handleInsertTestDeal}
        />
        <div className="flex-1 overflow-hidden">
          <DealDetail
            deal={editingDeal}
            onBack={() => setEditingDeal(null)}
            onUpdate={() => { refetchDeals(); setEditingDeal(null); }}
            onChatAction={handleDealChatAction}
          />
        </div>
      </div>
    );
  }

  // Show deal detail (read mode)
  if (selectedDeal) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header
          deals={deals} view={view}
          setView={(v) => { setView(v); setSelectedDeal(null); }}
          search={search} setSearch={setSearch}
          onDeleteAllDeals={handleDeleteAllDeals} onSignOut={signOut}
          onNewDeal={handleNewDeal}
          onInsertTestDeal={handleInsertTestDeal}
        />
        <div className="flex-1 overflow-hidden">
          <DealDetail
            deal={selectedDeal}
            onBack={() => setSelectedDeal(null)}
            onUpdate={refetchDeals}
            onChatAction={handleDealChatAction}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        deals={deals} view={view} setView={setView}
        search={search} setSearch={setSearch}
        onDeleteAllDeals={handleDeleteAllDeals} onSignOut={signOut}
        onNewDeal={handleNewDeal}
        onInsertTestDeal={handleInsertTestDeal}
      />
      <div className="flex-1 overflow-hidden">
        {view === 'chat' && (
          <ChatView
            messages={messages} parsing={parsing} onSend={handleSend}
            queuedTexts={queuedTexts} queueCount={queueCount}
            chats={chats} currentChatId={currentChatId}
            onSelectChat={setCurrentChatId} onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            pendingInput={pendingChatInput}
            onPendingInputConsumed={() => setPendingChatInput(null)}
            onViewBoard={() => setView('board')}
            activeDealsCount={deals.filter(d => !['completed', 'on_hold', 'dead'].includes(d.stage)).length}
          />
        )}
        {view === 'board' && (
          <BoardView
            deals={deals} search={search}
            onSelectDeal={setSelectedDeal}
            onEditDeal={handleEditDeal}
            onNewDeal={handleNewDeal}
            onRefetch={refetchDeals}
          />
        )}
        {view === 'list' && (
          <ListView
            deals={deals} search={search}
            onSelectDeal={setSelectedDeal}
            onNewDeal={handleNewDeal}
          />
        )}
      </div>
    </div>
  );
}