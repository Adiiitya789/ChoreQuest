import { getAI, getGenerativeModel, GoogleAIBackend, type FunctionDeclaration } from 'firebase/ai';
import { firebase } from '@/lib/firebase';
import { buildCoachTools, type ToolArgs } from '@/lib/coachTools';
import { localDayKey } from '@/lib/xp';
import { createLocalCoach } from '@/services/localCoach';
import type { GameState } from '@/types';

// The coach ("Neo") talks to Gemini through Firebase AI Logic, so the Gemini key
// lives in Firebase and never ships in the bundle. Gemini answers number questions
// by calling the tools in lib/coachTools.ts, which read the synced GameState.
//
// VITE_COACH_BACKEND=gemini turns on the live model (needs Build -> AI Logic ->
// Gemini Developer API enabled for the project). Anything else, or a failed
// Gemini call, uses the local engine, which calls the same tools and writes the
// reply on-device.

export const COACH_MODEL = 'gemini-3.6-flash';
const MAX_TOOL_CALLS = 6;

export interface ToolCall {
  name: string;
  args: ToolArgs;
}

export interface CoachReply {
  text: string;
  toolCalls: ToolCall[];
}

export interface CoachSession {
  readonly backend: 'gemini' | 'local';
  send(message: string): Promise<CoachReply>;
}

function systemInstruction(name: string) {
  const today = new Date();
  return [
    `You are Neo, the motivational coach inside ChoreQuest, a Matrix-themed game that turns chores into XP.`,
    `The player is ${name}. Today is ${localDayKey(today)} (${today.toLocaleDateString('en-IN', { weekday: 'long' })}).`,
    'Players earn XP by sorting emails (2 XP each, +10 every 10-email combo), filing expenses (3 XP + 1 coin) and completing quests (easy 10, medium 25, hard 50, calendar 15).',
    'Always call a tool before quoting any number. Never guess or invent stats.',
    "For 'how much more or less' questions use compare_periods; for specific dates use get_activity_between; for money use get_spending_summary (amounts are Indian rupees, write them as ₹).",
    'If daily_history_starts_on is after the period asked about, say tracking had not started yet rather than calling it zero effort.',
    'Reply in 2 to 5 short sentences of plain text, no markdown tables. Be warm, direct and a little Matrix-flavoured; end with one concrete next action.',
  ].join('\n');
}

/** Wraps each tool so the UI can show which functions the model called. */
function traced(tools: FunctionDeclaration[], log: ToolCall[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    ...tool,
    functionReference: (args: ToolArgs) => {
      log.push({ name: tool.name, args: args ?? {} });
      return (tool.functionReference as (a: ToolArgs) => unknown)(args);
    },
  }));
}

function createGeminiCoach(getState: () => GameState, playerName: string): CoachSession {
  if (!firebase) throw new Error('Firebase is not configured.');
  const calls: ToolCall[] = [];
  const ai = getAI(firebase.app, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(
    ai,
    {
      model: COACH_MODEL,
      systemInstruction: systemInstruction(playerName),
      tools: [{ functionDeclarations: traced(buildCoachTools(getState), calls) }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
    },
    { maxSequentialFunctionCalls: MAX_TOOL_CALLS, timeout: 30_000 },
  );
  const chat = model.startChat();

  return {
    backend: 'gemini',
    async send(message) {
      calls.length = 0;
      const result = await chat.sendMessage(message);
      return { text: result.response.text().trim(), toolCalls: [...calls] };
    },
  };
}

/**
 * Prefers Gemini; if a Gemini call fails (AI Logic not enabled, offline, quota),
 * the session switches to the local engine for the rest of the chat so the
 * player always gets an answer.
 */
function withFallback(primary: CoachSession, fallback: CoachSession): CoachSession {
  let active = primary;
  return {
    get backend() {
      return active.backend;
    },
    async send(message) {
      if (active === fallback) return fallback.send(message);
      try {
        return await primary.send(message);
      } catch (error) {
        console.warn('Gemini coach unavailable, using the local engine.', error);
        active = fallback;
        return fallback.send(message);
      }
    },
  };
}

export function createCoachSession(getState: () => GameState, playerName: string): CoachSession {
  const local = createLocalCoach(getState, playerName);
  const wantsGemini = import.meta.env.VITE_COACH_BACKEND === 'gemini';
  if (!wantsGemini || !firebase) return local;
  try {
    return withFallback(createGeminiCoach(getState, playerName), local);
  } catch (error) {
    console.warn('Gemini coach could not start, using the local engine.', error);
    return local;
  }
}
