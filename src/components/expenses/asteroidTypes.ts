import type { Expense, ExpenseCategory } from '@/types';

// Shared constants, entity shapes and small helpers for the Expense Asteroids
// engine (asteroidGame.ts) and its canvas renderer (asteroidRender.ts).

export const MAX_SHIELDS = 3;
/** Space at the bottom of the field reserved for the cannon row. */
export const CANNON_ZONE = 104;
export const SPAWN_DELAY = 0.7;
export const CHIP_SECONDS = 0.55;
export const IMPACT_COLOR = '#F87171';

export interface GameStats {
  shields: number;
  filed: number;
  combo: number;
  bestCombo: number;
}

export function initialStats(): GameStats {
  return { shields: MAX_SHIELDS, filed: 0, combo: 0, bestCombo: 0 };
}

export interface GameHooks {
  candidates: () => Expense[];
  onSpawn: (expense: Expense, suggested: ExpenseCategory | null) => void;
  onHit: (expense: Expense, category: ExpenseCategory) => void;
  onMiss: (expense: Expense) => void;
  onStats: (stats: GameStats) => void;
  onClear: () => void;
}

export interface Point {
  x: number;
  y: number;
}

export interface Asteroid {
  expense: Expense;
  suggested: ExpenseCategory | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rotation: number;
  spin: number;
  shape: number[];
  craters: { angle: number; dist: number; r: number }[];
}

export interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  points: number[];
  size: number;
  life: number;
}

export interface Ring {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
}

/** A filed payment flying from the broken asteroid into its category cannon. */
export interface Chip {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  color: string;
  label: string;
  category: ExpenseCategory;
}

export type CategoryLevels = Record<ExpenseCategory, number>;

export const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Random radius scales for an irregular polygon with `count` vertices. */
export function polygon(count: number, min: number, max: number): number[] {
  return Array.from({ length: count }, () => rand(min, max));
}

export function emptyLevels(): CategoryLevels {
  return { food: 0, travel: 0, bills: 0, shopping: 0, other: 0 };
}
