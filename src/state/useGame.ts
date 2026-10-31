import { useContext } from 'react';
import { GameContext, type GameContextValue } from '@/state/GameContext';

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside GameProvider');
  return value;
}
