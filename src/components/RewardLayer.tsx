import { useEffect } from 'react';
import { useGame } from '@/state/useGame';

export function RewardLayer() {
  const { rewards, dismissReward } = useGame();

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 sm:bottom-10">
      {rewards.map((reward) => (
        <RewardChip key={reward.id} id={reward.id} label={reward.label} xp={reward.xp} coins={reward.coins} onDone={dismissReward} />
      ))}
    </div>
  );
}

interface RewardChipProps {
  id: string;
  label: string;
  xp: number;
  coins: number;
  onDone: (id: string) => void;
}

function RewardChip({ id, label, xp, coins, onDone }: RewardChipProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDone(id), 1300);
    return () => window.clearTimeout(timer);
  }, [id, onDone]);

  return (
    <div className="animate-reward-float flex items-center gap-3 rounded-full border border-primary-600 bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-lift">
      <span>{label}</span>
      {xp !== 0 && (
        <span className="text-primary-600 tabular-nums">{xp > 0 ? `+${xp}` : xp} XP</span>
      )}
      {coins !== 0 && (
        <span className="text-primary-800 tabular-nums">{coins > 0 ? `+${coins}` : coins} coins</span>
      )}
    </div>
  );
}
