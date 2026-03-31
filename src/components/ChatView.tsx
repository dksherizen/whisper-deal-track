import { useState, useRef, useEffect } from "react";
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

export default function ChatView({ messages, parsing, onSend, queuedTexts, queueCount }: ChatViewProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, parsing]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || parsing) return;
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
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground text-sm max-w-md text-center leading-relaxed">
              Start talking. Dump notes, forward emails, ask "where do we stand." I'll parse everything into your deal pipeline.
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : msg.is_error
                    ? 'bg-destructive/20 text-destructive border border-destructive/30'
                    : 'bg-card text-card-foreground border border-border'
              }`}
            >
              {msg.text}
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
            disabled={!input.trim() || parsing}
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
