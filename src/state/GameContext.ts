import { createContext } from 'react';
import type { SfxKind } from '@/lib/sound';
import type { GameAction } from '@/state/gameReducer';
import type { GameState, RewardPopup } from '@/types';

export interface GameContextValue {
  state: GameState;
  dispatch: (action: GameAction) => void;
  muted: boolean;
  toggleMuted: () => void;
  playSound: (kind: SfxKind) => void;
  rewards: RewardPopup[];
  pushReward: (reward: Omit<RewardPopup, 'id'>) => void;
  dismissReward: (id: string) => void;
  saveFailed: boolean;
}

export const GameContext = createContext<GameContextValue | null>(null);
