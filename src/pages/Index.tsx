import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeals, useMessages, useDealChat } from "@/hooks/use-deals";
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
  const { messages, loading: msgsLoading, addMessage } = useMessages(userId);
  const { sendMessage, parsing } = useDealChat(userId, deals, refetchDeals);

  const [view, setView] = useState<ViewMode>('chat');
  const [search, setSearch] = useState("");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

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

  const handleReset = async () => {
    if (!userId) return;
    await supabase.from('messages').delete().eq('user_id', userId);
    await supabase.from('contacts').delete().eq('user_id', userId);
    // Deals cascade deletes timeline + delegations
    await supabase.from('deals').delete().eq('user_id', userId);
    await refetchDeals();
    window.location.reload();
  };

  const handleSend = (text: string) => {
    sendMessage(text, addMessage, messages);
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
          onReset={handleReset}
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
        onReset={handleReset}
        onSignOut={signOut}
      />
      <div className="flex-1 overflow-hidden">
        {view === 'chat' && (
          <ChatView messages={messages} parsing={parsing} onSend={handleSend} />
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
