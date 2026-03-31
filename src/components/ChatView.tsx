import { useState, useRef, useEffect } from "react";
import type { Message, Chat } from "@/lib/types";
import { Loader2, Send, Plus, Trash2, MessageSquare, ClipboardList, Search, CheckSquare, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatViewProps {
  messages: Message[];
  parsing: boolean;
  onSend: (text: string) => void;
  queuedTexts: string[];
  queueCount: number;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
}

const STARTER_PROMPTS = [
  "New deal just came in",
  "Update on an existing deal",
  "Where do we stand on everything",
  "Interview me about a deal",
  "Forward an email",
  "Who was supposed to do what",
];

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function isStructuredBlock(text: string): boolean {
  const lines = text.split('\n').filter(Boolean);
  return lines.length > 5 && (
    text.includes('PIPELINE') || text.includes('ACTIVE') ||
    text.includes('Stage:') || text.includes('TIMELINE') ||
    text.includes('DELEGATIONS') || text.includes('OPEN DELEGATIONS') ||
    /^[A-Z\s]+\(\d+/.test(text)
  );
}

function renderFormattedText(text: string, structured: boolean) {
  const lines = text.split('\n');
  return (
    <div className={structured ? 'font-mono text-xs leading-relaxed' : ''}>
      {lines.map((line, i) => {
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <span key={j} className="font-bold">{part.slice(2, -2)}</span>;
              }
              return <span key={j}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function ChatView({
  messages, parsing, onSend, queuedTexts, queueCount,
  chats, currentChatId, onSelectChat, onNewChat, onDeleteChat,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEmpty = messages.length === 0 && queuedTexts.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, parsing, queuedTexts]);

  const handleSend = (text?: string) => {
    const toSend = text || input.trim();
    if (!toSend) return;
    if (!text) setInput("");
    onSend(toSend);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleStarterClick = (prompt: string) => {
    if (prompt === "Interview me about a deal") {
      handleSend("[INTERVIEW MODE] The user wants to be interviewed about a new deal. Ask them ONE question at a time to build a complete deal record. Start with: \"What's the deal? Give me a name and location.\"");
    } else {
      handleSend(prompt);
    }
  };

  const handleQuickAction = (action: 'status' | 'find' | 'delegations' | 'interview') => {
    switch (action) {
      case 'status':
        handleSend("where do we stand on everything");
        break;
      case 'find':
        setInput("tell me about ");
        textareaRef.current?.focus();
        break;
      case 'delegations':
        handleSend("show me all open delegations across all deals");
        break;
      case 'interview':
        handleSend("[INTERVIEW MODE] The user wants to be interviewed about a new deal. Ask them ONE question at a time to build a complete deal record. Start with: \"What's the deal? Give me a name and location.\"");
        break;
    }
  };

  return (
    <div className="flex h-full">
      {/* Chat Sidebar */}
      <div className="w-56 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-2 border-b border-border">
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={onNewChat}>
            <Plus className="h-3 w-3" />
            New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer text-xs border-b border-border/50 transition-colors ${
                chat.id === currentChatId
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
              onClick={() => onSelectChat(chat.id)}
            >
              <MessageSquare className="h-3 w-3 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate">{chat.title}</p>
                <p className="text-[10px] text-muted-foreground/60">{formatRelative(chat.updated_at)}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete chat?</AlertDialogTitle>
                    <AlertDialogDescription>This will delete the chat messages but will NOT remove any deals created from this chat.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteChat(chat.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
          {chats.length === 0 && (
            <p className="text-muted-foreground/50 text-xs text-center p-4">No chats yet</p>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isEmpty && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-lg">
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Start talking. Dump notes, forward emails, ask "where do we stand." I'll parse everything into your deal pipeline.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STARTER_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => handleStarterClick(prompt)}
                      className="px-3 py-1.5 text-[11px] rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 bg-card transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            const structured = !isUser && !msg.is_error && isStructuredBlock(msg.text);
            // Hide the [INTERVIEW MODE] prefix from display
            const displayText = isUser && msg.text.startsWith('[INTERVIEW MODE]')
              ? 'Interview me about a deal'
              : msg.text;
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${structured ? 'max-w-[85%]' : ''}`}>
                  <div
                    className={`px-3 py-2 rounded-lg text-sm ${
                      isUser
                        ? 'bg-primary text-primary-foreground'
                        : msg.is_error
                          ? 'bg-destructive/20 text-destructive border border-destructive/30'
                          : 'bg-card text-card-foreground border border-border'
                    }`}
                  >
                    {isUser ? (
                      <span className="whitespace-pre-wrap">{displayText}</span>
                    ) : (
                      renderFormattedText(msg.text, structured)
                    )}
                  </div>
                  <p className={`text-[10px] text-muted-foreground/60 mt-0.5 ${isUser ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          {queuedTexts.map((qt, i) => {
            const displayText = qt.startsWith('[INTERVIEW MODE]') ? 'Interview me about a deal' : qt;
            return (
              <div key={`queued-${i}`} className="flex justify-end">
                <div className="max-w-[75%]">
                  <div className="bg-primary/60 text-primary-foreground px-3 py-2 rounded-lg text-sm whitespace-pre-wrap">
                    {displayText}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 text-right">queued</p>
                </div>
              </div>
            );
          })}
          {parsing && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Parsing...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3">
          {queueCount > 0 && (
            <p className="text-xs text-muted-foreground mb-2">{queueCount} message{queueCount > 1 ? 's' : ''} queued...</p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Type a brain dump, forward an email, or ask about your pipeline..."
              rows={1}
              className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {/* Persistent quick actions */}
          <div className="flex items-center gap-1 mt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleQuickAction('status')}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Pipeline status</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleQuickAction('find')}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Find a deal</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleQuickAction('delegations')}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <CheckSquare className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Open delegations</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleQuickAction('interview')}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Interview mode</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
