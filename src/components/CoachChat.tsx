import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, Terminal, X } from 'lucide-react';
import type { CoachSession, ToolCall } from '@/services/coach';
import { useAuth } from '@/state/useAuth';
import { useGame } from '@/state/useGame';

interface ChatMessage {
  id: number;
  role: 'user' | 'coach' | 'error';
  text: string;
  toolCalls?: ToolCall[];
}

const SUGGESTIONS = [
  'How much more did I score this week?',
  'Compare this month to last month',
  'Where did my money go?',
  'What should I do next?',
  "I'm not feeling motivated",
];

function formatCall(call: ToolCall) {
  const args = Object.entries(call.args)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(', ');
  return `${call.name}(${args})`;
}

export function CoachChat() {
  const { state } = useGame();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const stateRef = useRef(state);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  stateRef.current = state;
  const playerName = user?.displayName ?? 'Operator';
  const firstName = playerName.split(' ')[0];

  // One chat session per player, so the model keeps conversation context. The
  // coach (and the Gemini SDK) is only downloaded when the first question is asked.
  const sessionRef = useRef<Promise<CoachSession> | null>(null);
  const getSession = () => {
    sessionRef.current ??= import('@/services/coach').then((m) =>
      m.createCoachSession(() => stateRef.current, playerName),
    );
    return sessionRef.current;
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const push = (message: Omit<ChatMessage, 'id'>) =>
    setMessages((current) => [...current, { ...message, id: nextId.current++ }]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    setInput('');
    push({ role: 'user', text });
    setBusy(true);
    try {
      const session = await getSession();
      const reply = await session.send(text);
      push({ role: 'coach', text: reply.text || 'Signal lost. Try asking again.', toolCalls: reply.toolCalls });
    } catch (error) {
      push({ role: 'error', text: error instanceof Error ? error.message : 'The coach could not be reached.' });
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void ask(input);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-primary-600 bg-surface px-4 py-3 text-sm font-medium text-primary-600 shadow-card transition hover:bg-primary-50"
        aria-label="Open coach chat"
      >
        <Bot className="h-5 w-5" aria-hidden="true" />
        <span className="font-display tracking-widest text-glow">ASK NEO</span>
      </button>
    );
  }

  return (
    <section
      aria-label="Coach chat"
      className="fixed inset-x-4 bottom-4 z-40 flex max-h-[75vh] flex-col overflow-hidden rounded-lg border border-primary-600 bg-paper/95 shadow-card backdrop-blur sm:inset-x-auto sm:right-5 sm:w-[400px]"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary-600" aria-hidden="true" />
          <div>
            <p className="font-display text-sm tracking-widest text-primary-600 text-glow">NEO // COACH</p>
            <p className="text-[11px] text-ink-muted">reads your synced stats · ask anything</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring rounded p-1 text-ink-muted hover:text-primary-600"
          aria-label="Close coach chat"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
        <p className="leading-relaxed text-ink">
          <span className="text-primary-600">neo&gt;</span> Wake up, {firstName}. I can see every email you sort, every
          expense you file and every quest you clear. Ask how you're doing, or tell me you need a push.
        </p>

        {messages.map((message) =>
          message.role === 'user' ? (
            <p key={message.id} className="leading-relaxed text-ink-muted">
              <span className="text-primary-700">{firstName.toLowerCase()}&gt;</span> {message.text}
            </p>
          ) : message.role === 'error' ? (
            <p key={message.id} role="alert" className="rounded border border-warning-200 bg-warning-50 px-3 py-2 text-warning-800">
              ! {message.text}
            </p>
          ) : (
            <div key={message.id} className="space-y-1">
              {message.toolCalls?.map((call, i) => (
                <p key={i} className="truncate font-mono text-[11px] text-ink-muted/70" title={formatCall(call)}>
                  ⚙ {formatCall(call)}
                </p>
              ))}
              <p className="leading-relaxed text-ink">
                <span className="text-primary-600">neo&gt;</span> {message.text}
              </p>
            </div>
          ),
        )}

        {busy && (
          <p className="text-ink-muted">
            <span className="text-primary-600">neo&gt;</span> analysing your data<span className="animate-pulse">_</span>
          </p>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void ask(suggestion)}
              className="focus-ring rounded-full border border-line px-3 py-1 text-xs text-ink-muted transition hover:border-primary-600 hover:text-primary-600"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-line px-3 py-3">
        <span className="pl-1 text-primary-600" aria-hidden="true">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Neo about your progress..."
          aria-label="Message the coach"
          maxLength={300}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="focus-ring flex h-8 w-8 items-center justify-center rounded border border-primary-600 text-primary-600 transition hover:bg-primary-50 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </section>
  );
}
