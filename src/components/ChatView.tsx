import { useState, useRef, useEffect, useMemo } from "react";
import type { Message } from "@/lib/types";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatViewProps {
  messages: Message[];
  parsing: boolean;
  onSend: (text: string) => void;
  queuedTexts: string[];
  queueCount: number;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isStructuredBlock(text: string): boolean {
  // Detect pipeline/status responses with multiple lines and field-like patterns
  const lines = text.split('\n').filter(Boolean);
  return lines.length > 5 && (
    text.includes('PIPELINE') || text.includes('ACTIVE') ||
    text.includes('Stage:') || text.includes('TIMELINE') ||
    text.includes('DELEGATIONS') || /^[A-Z\s]+\(\d+/.test(text)
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
        // Parse **bold** segments
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

export default function ChatView({ messages, parsing, onSend, queuedTexts, queueCount }: ChatViewProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, parsing, queuedTexts]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    onSend(text);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && queuedTexts.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm max-w-md text-center leading-relaxed">
              Start talking. Dump notes, forward emails, ask "where do we stand." I'll parse everything into your deal pipeline.
            </p>
          </div>
        )}
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          const structured = !isUser && !msg.is_error && isStructuredBlock(msg.text);
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
                    <span className="whitespace-pre-wrap">{msg.text}</span>
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
        {queuedTexts.map((qt, i) => (
          <div key={`queued-${i}`} className="flex justify-end">
            <div className="max-w-[75%]">
              <div className="bg-primary/60 text-primary-foreground px-3 py-2 rounded-lg text-sm whitespace-pre-wrap">
                {qt}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 text-right">queued</p>
            </div>
          </div>
        ))}
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
            onClick={handleSend}
            disabled={!input.trim()}
            size="icon"
            className="h-9 w-9 shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
