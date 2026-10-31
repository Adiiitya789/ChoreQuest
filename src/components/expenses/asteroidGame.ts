import { EXPENSE_CATEGORIES, formatRupees, guessCategory } from '@/lib/expenses';
import { MatrixRain } from '@/lib/matrixRain';
import type { Expense, ExpenseCategory } from '@/types';

export const MAX_SHIELDS = 3;

// Space at the bottom of the field reserved for the cannon row.
const CANNON_ZONE = 104;
const SPAWN_DELAY = 0.7;
const CHIP_SECONDS = 0.55;
const IMPACT_COLOR = '#F87171';

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

interface Asteroid {
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

interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Shard {
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

interface Ring {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
}

interface Chip {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t: number;
  color: string;
  label: string;
  category: ExpenseCategory;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function polygon(count: number, min: number, max: number): number[] {
  return Array.from({ length: count }, () => rand(min, max));
}

function tracePolygon(ctx: CanvasRenderingContext2D, points: number[], radius: number) {
  ctx.beginPath();
  points.forEach((scale, i) => {
    const angle = (i / points.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius * scale;
    const y = Math.sin(angle) * radius * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
}

function emptyPulses(): Record<ExpenseCategory, number> {
  return { food: 0, travel: 0, bills: 0, shopping: 0, other: 0 };
}

/**
 * Canvas game where each uncategorised expense falls as an asteroid. Firing a
 * category's cannon breaks it and files the expense; letting it reach the
 * ground costs a shield and sends it to the back of the queue.
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
  private pulses = emptyPulses();
  private recoil = emptyPulses();
  private spawnTimer = 0.5;
  private clearTimer = -1;
  private shake = 0;
  private aim = { x: -1, y: -1 };
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

    this.drawBackground(ctx);
    if (this.asteroid) this.drawAsteroid(ctx, this.asteroid);
    this.drawEffects(ctx);
    this.drawCrosshair(ctx);
    this.drawCannons(ctx);
    this.drawChips(ctx);

    ctx.restore();

    this.drawScanlines(ctx);
    ctx.save();
    ctx.font = '22px "Share Tech Mono", "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#00FF41';
    ctx.shadowColor = 'rgba(0, 255, 65, 0.7)';
    ctx.shadowBlur = 10;
    ctx.fillText(`DESTROYED: ${this.stats.filed}`, 16, 14);
    ctx.restore();

    if (this.shake > 0.05 && !this.reduceMotion) {
      ctx.fillStyle = `rgba(248, 113, 113, ${this.shake * 0.18})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private restingAim() {
    return { x: this.width / 2, y: this.groundY() * 0.45 };
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D) {
    const { x, y } = this.aim;
    const target = this.asteroid;
    const locked = target !== null && Math.hypot(target.x - x, target.y - y) < 10;
    const breathe = locked ? 0 : Math.sin(this.time * 4) * 2;
    const s = (target ? target.r + 14 : 24) + breathe;
    const arm = s * 0.38;

    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = locked ? '#00FF41' : 'rgba(0, 255, 65, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00FF41';
    ctx.shadowBlur = locked ? 12 : 4;
    ctx.lineCap = 'round';
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(sx * s, sy * (s - arm));
      ctx.lineTo(sx * s, sy * s);
      ctx.lineTo(sx * (s - arm), sy * s);
      ctx.stroke();
    }
    // Ticks sit on the frame edges so they never cover the asteroid's label.
    ctx.beginPath();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      ctx.moveTo(dx * (s + 7), dy * (s + 7));
      ctx.lineTo(dx * (s - 5), dy * (s - 5));
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawScanlines(ctx: CanvasRenderingContext2D) {
    const { width, height } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 6, 2, 0.22)';
    for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.35,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75,
    );
    vignette.addColorStop(0, 'rgba(1, 5, 2, 0)');
    vignette.addColorStop(1, 'rgba(1, 5, 2, 0.6)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
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

  private cannonTip(index: number) {
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

  private drawBackground(ctx: CanvasRenderingContext2D) {
    const { width, height } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#021306');
    sky.addColorStop(0.55, '#010A03');
    sky.addColorStop(1, '#000401');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, width + 40, height + 40);

    const nebulas: [number, number, number, string][] = [
      [0.2, 0.25, 0.45, 'rgba(0, 255, 65, 0.07)'],
      [0.85, 0.15, 0.35, 'rgba(0, 200, 80, 0.05)'],
      [0.65, 0.6, 0.4, 'rgba(0, 255, 65, 0.04)'],
    ];
    for (const [nx, ny, nr, color] of nebulas) {
      const radius = nr * Math.max(width, height);
      const glow = ctx.createRadialGradient(nx * width, ny * height, 0, nx * width, ny * height, radius);
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    // Kept dim so asteroid labels stay readable over it.
    this.rain.draw(ctx, 0.28);

    // Surface below the shield line.
    const ground = this.groundY();
    const surface = ctx.createLinearGradient(0, ground, 0, height);
    surface.addColorStop(0, 'rgba(3, 30, 10, 0.95)');
    surface.addColorStop(1, 'rgba(0, 8, 2, 1)');
    ctx.fillStyle = surface;
    ctx.fillRect(-20, ground, width + 40, height - ground + 20);

    // Shield line: brighter with more shields left.
    const strength = this.stats.shields / MAX_SHIELDS;
    ctx.save();
    ctx.strokeStyle = strength > 0 ? `rgba(0, 255, 65, ${0.25 + 0.55 * strength})` : 'rgba(248, 113, 113, 0.5)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00FF41';
    ctx.shadowBlur = 12 * strength;
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -this.time * 20;
    ctx.beginPath();
    ctx.moveTo(0, ground);
    ctx.lineTo(width, ground);
    ctx.stroke();
    ctx.restore();
  }

  private drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
    const { r } = asteroid;
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);

    const trail = ctx.createLinearGradient(0, -r * 3.2, 0, 0);
    trail.addColorStop(0, 'rgba(0, 255, 65, 0)');
    trail.addColorStop(1, 'rgba(0, 255, 65, 0.2)');
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, 0);
    ctx.lineTo(0, -r * 3.2);
    ctx.lineTo(r * 0.75, 0);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.rotate(asteroid.rotation);
    const rock = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.1);
    rock.addColorStop(0, '#46604D');
    rock.addColorStop(0.5, '#22332A');
    rock.addColorStop(1, '#0A130D');
    ctx.fillStyle = rock;
    ctx.shadowColor = 'rgba(0, 255, 65, 0.45)';
    ctx.shadowBlur = 18;
    tracePolygon(ctx, asteroid.shape, r);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(2, 10, 4, 0.5)';
    for (const crater of asteroid.craters) {
      ctx.beginPath();
      ctx.arc(
        Math.cos(crater.angle) * r * crater.dist,
        Math.sin(crater.angle) * r * crater.dist,
        r * crater.r,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();

    // Labels stay upright so they are readable while the rock spins.
    const fontSize = Math.max(11, Math.min(14, r * 0.24));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.font = `600 ${fontSize}px "Share Tech Mono", "JetBrains Mono", monospace`;
    ctx.fillStyle = '#E8FFEE';
    ctx.fillText(fitText(ctx, asteroid.expense.merchant, r * 1.65), 0, -fontSize * 0.55);
    ctx.font = `700 ${fontSize * 1.1}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillStyle = '#00FF41';
    ctx.fillText(fitText(ctx, formatRupees(asteroid.expense.amount), r * 1.75), 0, fontSize * 0.85);
    ctx.restore();
  }

  private drawEffects(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const beam of this.beams) {
      const alpha = beam.life / beam.maxLife;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = beam.color;
      ctx.lineWidth = 9;
      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(beam.x1, beam.y1);
      ctx.lineTo(beam.x2, beam.y2);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    for (const ring of this.rings) {
      ctx.globalAlpha = ring.life * 0.7;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    for (const shard of this.shards) {
      ctx.globalAlpha = Math.max(0, shard.life);
      ctx.save();
      ctx.translate(shard.x, shard.y);
      ctx.rotate(shard.rotation);
      ctx.fillStyle = '#2F4A38';
      tracePolygon(ctx, shard.points, shard.size);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private drawCannons(ctx: CanvasRenderingContext2D) {
    const y = this.cannonY();
    EXPENSE_CATEGORIES.forEach((category, index) => {
      const x = this.cannonX(index);
      const pulse = this.pulses[category.id];
      const recoil = this.recoil[category.id];

      if (this.asteroid?.suggested === category.id) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.25 * Math.sin(this.time * 6);
        ctx.strokeStyle = category.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y - 4, 30, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (pulse > 0) {
        ctx.save();
        ctx.globalAlpha = pulse * 0.6;
        ctx.fillStyle = category.color;
        ctx.beginPath();
        ctx.arc(x, y - 4, 22 + (1 - pulse) * 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(x, y - 6);
      ctx.rotate(this.barrelAngle(index));
      ctx.fillStyle = category.color;
      ctx.shadowColor = category.color;
      ctx.shadowBlur = 8 + recoil * 12;
      ctx.fillRect(2 - recoil * 6, -4, 26, 8);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = '#062A12';
      ctx.strokeStyle = category.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 18, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = category.color;
      ctx.beginPath();
      ctx.arc(x, y - 6, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 12px "Share Tech Mono", "JetBrains Mono", monospace';
      ctx.fillStyle = '#C9FFD5';
      ctx.fillText(category.label, x, y + 20);
      ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = category.color;
      ctx.fillText(category.key, x, y + 36);
      ctx.restore();
    });
  }

  private drawChips(ctx: CanvasRenderingContext2D) {
    for (const chip of this.chips) {
      const t = chip.t;
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const x = chip.fromX + (chip.toX - chip.fromX) * ease;
      const y = chip.fromY + (chip.toY - chip.fromY) * ease - Math.sin(Math.PI * t) * 50;
      ctx.save();
      ctx.fillStyle = chip.color;
      ctx.shadowColor = chip.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1 - t * 0.6;
      ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#D2FFDC';
      ctx.fillText(chip.label, x, y - 14);
      ctx.restore();
    }
  }
}
