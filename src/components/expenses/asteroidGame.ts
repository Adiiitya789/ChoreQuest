import { EXPENSE_CATEGORIES, formatRupees, guessCategory } from '@/lib/expenses';
import { MatrixRain } from '@/lib/matrixRain';
import {
  drawAsteroid,
  drawBackground,
  drawCannons,
  drawChips,
  drawCrosshair,
  drawEffects,
  drawScanlines,
  drawScoreCounter,
  type CannonView,
} from '@/components/expenses/asteroidRender';
import {
  CANNON_ZONE,
  CHIP_SECONDS,
  IMPACT_COLOR,
  MAX_SHIELDS,
  SPAWN_DELAY,
  emptyLevels,
  initialStats,
  polygon,
  rand,
  type Asteroid,
  type Beam,
  type Chip,
  type GameHooks,
  type GameStats,
  type Particle,
  type Point,
  type Ring,
  type Shard,
} from '@/components/expenses/asteroidTypes';
import type { Expense, ExpenseCategory } from '@/types';

export { MAX_SHIELDS, initialStats, type GameHooks, type GameStats };

/**
 * Canvas game where each uncategorised expense falls as an asteroid. Firing a
 * category's cannon breaks it and files the expense; letting it reach the
 * ground costs a shield and sends it to the back of the queue.
 *
 * This class owns game state and physics; all drawing lives in asteroidRender.ts.
 */
export class AsteroidGame {
  hooks: GameHooks;
  stats: GameStats = initialStats();

  private width = 0;
  private height = 0;
  private time = 0;
  private rain = new MatrixRain(16, 14, [50, 140]);
  private asteroid: Asteroid | null = null;
  private beams: Beam[] = [];
  private particles: Particle[] = [];
  private shards: Shard[] = [];
  private rings: Ring[] = [];
  private chips: Chip[] = [];
  private pulses = emptyLevels();
  private recoil = emptyLevels();
  private spawnTimer = 0.5;
  private clearTimer = -1;
  private shake = 0;
  private aim: Point = { x: -1, y: -1 };
  // Expenses already shot whose dispatch may not have re-rendered the queue yet.
  private resolved = new Set<string>();
  private misses = new Map<string, number>();

  constructor(
    hooks: GameHooks,
    private readonly reduceMotion: boolean,
  ) {
    this.hooks = hooks;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.rain.resize(width, height);
    if (this.aim.x < 0) this.aim = this.restingAim();
    if (this.asteroid) {
      this.asteroid.x = Math.min(Math.max(this.asteroid.x, this.asteroid.r), width - this.asteroid.r);
    }
  }

  reset() {
    this.asteroid = null;
    this.beams = [];
    this.particles = [];
    this.shards = [];
    this.rings = [];
    this.chips = [];
    this.spawnTimer = 0.6;
    this.clearTimer = -1;
    this.resolved.clear();
    this.stats = initialStats();
    this.hooks.onStats({ ...this.stats });
  }

  fire(category: ExpenseCategory): boolean {
    const index = EXPENSE_CATEGORIES.findIndex((item) => item.id === category);
    const color = EXPENSE_CATEGORIES[index].color;
    const tip = this.cannonTip(index);
    this.recoil[category] = 1;

    const target = this.asteroid;
    if (!target) {
      this.beams.push({ x1: tip.x, y1: tip.y, x2: tip.x, y2: -10, color, life: 0.12, maxLife: 0.12 });
      return false;
    }

    this.aim = { x: target.x, y: target.y };
    this.beams.push({ x1: tip.x, y1: tip.y, x2: target.x, y2: target.y, color, life: 0.22, maxLife: 0.22 });
    this.explode(target, color, 1);
    this.chips.push({
      fromX: target.x,
      fromY: target.y,
      toX: this.cannonX(index),
      toY: this.cannonY(),
      t: 0,
      color,
      label: formatRupees(target.expense.amount),
      category,
    });

    this.asteroid = null;
    this.resolved.add(target.expense.id);
    this.spawnTimer = SPAWN_DELAY;
    const combo = this.stats.combo + 1;
    this.stats = {
      ...this.stats,
      filed: this.stats.filed + 1,
      combo,
      bestCombo: Math.max(this.stats.bestCombo, combo),
    };
    this.hooks.onStats({ ...this.stats });
    this.hooks.onHit(target.expense, category);
    return true;
  }

  update(dt: number, active: boolean) {
    this.time += dt;
    this.rain.update(dt);
    if (active) this.updatePlay(dt);
    this.updateEffects(dt);
  }

  draw(ctx: CanvasRenderingContext2D) {
    const { width, height } = this;
    ctx.save();
    if (this.shake > 0 && !this.reduceMotion) {
      ctx.translate(rand(-1, 1) * this.shake * 9, rand(-1, 1) * this.shake * 9);
    }

    drawBackground(ctx, {
      width,
      height,
      ground: this.groundY(),
      time: this.time,
      shieldStrength: this.stats.shields / MAX_SHIELDS,
      rain: this.rain,
    });
    if (this.asteroid) drawAsteroid(ctx, this.asteroid);
    drawEffects(ctx, { beams: this.beams, rings: this.rings, particles: this.particles, shards: this.shards });
    drawCrosshair(ctx, this.aim, this.asteroid, this.time);
    drawCannons(ctx, this.cannonViews(), this.time);
    drawChips(ctx, this.chips);

    ctx.restore();

    drawScanlines(ctx, width, height);
    drawScoreCounter(ctx, this.stats.filed);

    if (this.shake > 0.05 && !this.reduceMotion) {
      ctx.fillStyle = `rgba(248, 113, 113, ${this.shake * 0.18})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private cannonViews(): CannonView[] {
    const y = this.cannonY();
    return EXPENSE_CATEGORIES.map((category, index) => ({
      category,
      x: this.cannonX(index),
      y,
      angle: this.barrelAngle(index),
      pulse: this.pulses[category.id],
      recoil: this.recoil[category.id],
      suggested: this.asteroid?.suggested === category.id,
    }));
  }

  private restingAim(): Point {
    return { x: this.width / 2, y: this.groundY() * 0.45 };
  }

  private groundY() {
    return this.height - CANNON_ZONE;
  }

  private cannonX(index: number) {
    return (this.width * (index + 0.5)) / EXPENSE_CATEGORIES.length;
  }

  private cannonY() {
    return this.height - 58;
  }

  private barrelAngle(index: number) {
    const x = this.cannonX(index);
    const y = this.cannonY() - 6;
    if (!this.asteroid) return -Math.PI / 2;
    const angle = Math.atan2(this.asteroid.y - y, this.asteroid.x - x);
    return Math.min(-0.35, Math.max(-Math.PI + 0.35, angle));
  }

  private cannonTip(index: number): Point {
    const angle = this.barrelAngle(index);
    return {
      x: this.cannonX(index) + Math.cos(angle) * 28,
      y: this.cannonY() - 6 + Math.sin(angle) * 28,
    };
  }

  private fallSpeed(radius: number) {
    const seconds = Math.max(3.4, 9 - this.stats.filed * 0.25);
    return (this.groundY() + radius) / seconds;
  }

  private pickNext(): Expense | undefined {
    const pool = this.hooks.candidates().filter((expense) => !this.resolved.has(expense.id));
    if (pool.length === 0) return undefined;
    const missesOf = (expense: Expense) => this.misses.get(expense.id) ?? 0;
    return pool.reduce((best, expense) => (missesOf(expense) < missesOf(best) ? expense : best));
  }

  private spawn(expense: Expense) {
    const r = Math.max(40, Math.min(60, this.width * 0.075));
    const suggested = guessCategory(expense.merchant);
    this.asteroid = {
      expense,
      suggested,
      r,
      x: rand(r + 16, Math.max(r + 16, this.width - r - 16)),
      y: -r,
      vx: rand(-14, 14),
      vy: this.fallSpeed(r),
      rotation: rand(0, Math.PI * 2),
      spin: rand(-0.6, 0.6),
      shape: polygon(12, 0.8, 1.08),
      craters: Array.from({ length: 3 }, () => ({
        angle: rand(0, Math.PI * 2),
        dist: rand(0.2, 0.55),
        r: rand(0.1, 0.2),
      })),
    };
    this.hooks.onSpawn(expense, suggested);
  }

  private updatePlay(dt: number) {
    const asteroid = this.asteroid;
    if (asteroid) {
      asteroid.x += asteroid.vx * dt;
      if (asteroid.x < asteroid.r || asteroid.x > this.width - asteroid.r) asteroid.vx *= -1;
      asteroid.y += asteroid.vy * dt;
      asteroid.rotation += asteroid.spin * dt;
      if (asteroid.y + asteroid.r * 0.6 >= this.groundY()) this.impact(asteroid);
      return;
    }

    if (this.clearTimer >= 0) {
      this.clearTimer -= dt;
      if (this.clearTimer < 0) {
        if (this.pickNext()) this.spawnTimer = 0;
        else this.hooks.onClear();
      }
      return;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const next = this.pickNext();
    if (next) this.spawn(next);
    else this.clearTimer = 1;
  }

  private impact(asteroid: Asteroid) {
    this.explode(asteroid, IMPACT_COLOR, 1.4);
    this.asteroid = null;
    this.shake = 1;
    this.spawnTimer = SPAWN_DELAY + 0.4;
    this.misses.set(asteroid.expense.id, (this.misses.get(asteroid.expense.id) ?? 0) + 1);
    this.stats = { ...this.stats, shields: Math.max(0, this.stats.shields - 1), combo: 0 };
    this.hooks.onStats({ ...this.stats });
    this.hooks.onMiss(asteroid.expense);
  }

  private explode(asteroid: Asteroid, color: string, power: number) {
    const { x, y, r } = asteroid;
    for (let i = 0; i < 34 * power; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(60, 280) * power;
      const maxLife = rand(0.45, 1);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        color: i % 3 === 0 ? '#D2FFDC' : color,
        size: rand(1.5, 3.5),
      });
    }
    for (let i = 0; i < 8; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(40, 170);
      this.shards.push({
        x: x + Math.cos(angle) * r * 0.3,
        y: y + Math.sin(angle) * r * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        rotation: rand(0, Math.PI * 2),
        spin: rand(-5, 5),
        points: polygon(6, 0.6, 1.1),
        size: r * rand(0.18, 0.38),
        life: 1,
      });
    }
    this.rings.push({ x, y, radius: r * 0.6, color, life: 1 });
  }

  private updateEffects(dt: number) {
    this.beams = this.beams.filter((beam) => (beam.life -= dt) > 0);

    this.particles = this.particles.filter((p) => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 + 40 * dt;
      return (p.life -= dt) > 0;
    });

    this.shards = this.shards.filter((s) => {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 120 * dt;
      s.rotation += s.spin * dt;
      return (s.life -= dt * 0.9) > 0;
    });

    this.rings = this.rings.filter((ring) => {
      ring.radius += 260 * dt;
      return (ring.life -= dt * 2.2) > 0;
    });

    this.chips = this.chips.filter((chip) => {
      chip.t += dt / CHIP_SECONDS;
      if (chip.t < 1) return true;
      this.pulses[chip.category] = 1;
      return false;
    });

    for (const category of EXPENSE_CATEGORIES) {
      this.pulses[category.id] = Math.max(0, this.pulses[category.id] - dt * 2.5);
      this.recoil[category.id] = Math.max(0, this.recoil[category.id] - dt * 6);
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);

    const goal = this.asteroid ? { x: this.asteroid.x, y: this.asteroid.y } : this.restingAim();
    const follow = 1 - Math.exp(-dt * (this.asteroid ? 12 : 3));
    this.aim.x += (goal.x - this.aim.x) * follow;
    this.aim.y += (goal.y - this.aim.y) * follow;
  }
}
