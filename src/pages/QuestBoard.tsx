import { useState, type FormEvent } from 'react';
import { CalendarDays, Check, Plus, ScrollText, Trash2, type LucideIcon } from 'lucide-react';
import { questReward, QUEST_REWARDS } from '@/lib/xp';
import { useGame } from '@/state/useGame';
import type { CalendarQuest, Difficulty, ManualQuest, Quest } from '@/types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export function QuestBoard() {
  const { state, dispatch, playSound, pushReward } = useGame();
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  const calendarQuests = state.quests.filter((quest): quest is CalendarQuest => quest.kind === 'calendar');
  const manualQuests = state.quests.filter((quest): quest is ManualQuest => quest.kind === 'manual');
  const doneCount = state.quests.filter((quest) => quest.done).length;

  function toggleQuest(quest: Quest) {
    const reward = questReward(quest);
    dispatch({ type: 'TOGGLE_QUEST', id: quest.id, at: new Date().toISOString() });
    if (quest.done) {
      pushReward({ label: 'Quest reopened', xp: -reward.xp, coins: -reward.coins });
      return;
    }
    pushReward({ label: 'Quest complete', xp: reward.xp, coins: reward.coins });
    playSound('questDone');
  }

  function addQuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_QUEST', id: crypto.randomUUID(), title: trimmed, difficulty });
    setTitle('');
  }

  return (
    <section aria-labelledby="quest-board-heading" className="mx-auto max-w-2xl">
      <div>
        <h1 id="quest-board-heading" className="text-3xl uppercase leading-tight text-primary-600 text-glow sm:text-4xl">
          Quest Board
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Turn real chores and today's schedule into quests. {doneCount} of {state.quests.length} completed.
        </p>
      </div>

      <form onSubmit={addQuest} className="mt-8 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <label htmlFor="quest-title" className="text-sm font-semibold text-ink">
          New quest
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            id="quest-title"
            type="text"
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Fold the laundry"
            className="focus-ring min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-subtle"
          />
          <button
            type="submit"
            disabled={!title.trim()}
            className="focus-ring flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-paper transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add quest
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-ink-muted">Difficulty</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIFFICULTIES.map((level) => {
              const active = difficulty === level;
              const reward = QUEST_REWARDS[level];
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDifficulty(level)}
                  className={`focus-ring rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'border-primary-600 bg-primary-600 text-paper'
                      : 'border-line bg-surface text-ink hover:border-primary-500'
                  }`}
                >
                  {DIFFICULTY_LABEL[level]}
                  <span className={`ml-2 text-xs ${active ? 'text-paper/70' : 'text-ink-muted'}`}>
                    {reward.xp} XP
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </form>

      <QuestSection
        icon={CalendarDays}
        title="Today's schedule"
        emptyText="Nothing on the calendar today."
        quests={calendarQuests}
        onToggle={toggleQuest}
      />

      <QuestSection
        icon={ScrollText}
        title="Your quests"
        emptyText="No quests yet. Add one above to earn XP and coins."
        quests={manualQuests}
        onToggle={toggleQuest}
        onDelete={(id) => dispatch({ type: 'DELETE_QUEST', id })}
      />
    </section>
  );
}

interface QuestSectionProps {
  icon: LucideIcon;
  title: string;
  emptyText: string;
  quests: Quest[];
  onToggle: (quest: Quest) => void;
  onDelete?: (id: string) => void;
}

function QuestSection({ icon: Icon, title, emptyText, quests, onToggle, onDelete }: QuestSectionProps) {
  return (
    <div className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
        <Icon className="h-5 w-5 text-primary-700" aria-hidden="true" />
        {title}
      </h2>

      {quests.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-ink-muted">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {quests.map((quest) => (
            <QuestRow key={quest.id} quest={quest} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </div>
  );
}

interface QuestRowProps {
  quest: Quest;
  onToggle: (quest: Quest) => void;
  onDelete?: (id: string) => void;
}

function QuestRow({ quest, onToggle, onDelete }: QuestRowProps) {
  const reward = questReward(quest);
  const meta =
    quest.kind === 'calendar' ? quest.time : DIFFICULTY_LABEL[quest.difficulty];

  return (
    <li
      className={`flex items-center gap-4 rounded-2xl border bg-surface px-4 py-3.5 shadow-card transition ${
        quest.done ? 'border-primary-200 bg-primary-50/60' : 'border-line hover:border-primary-500'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(quest)}
        aria-pressed={quest.done}
        aria-label={`${quest.done ? 'Reopen' : 'Complete'} ${quest.title}`}
        className={`focus-ring flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
          quest.done ? 'border-primary-600 bg-primary-600 text-paper' : 'border-ink-subtle bg-surface text-transparent hover:border-primary-600'
        }`}
      >
        <Check className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${quest.done ? 'text-ink-muted line-through' : 'text-ink'}`}>
          {quest.title}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">{meta}</p>
      </div>

      <span className="hidden shrink-0 rounded-full bg-paper-deep px-3 py-1 text-xs font-semibold text-ink tabular-nums sm:inline">
        +{reward.xp} XP · {reward.coins} coins
      </span>

      {quest.kind === 'manual' && !quest.done && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(quest.id)}
          aria-label={`Delete ${quest.title}`}
          className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition hover:bg-danger-50 hover:text-danger-700"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
