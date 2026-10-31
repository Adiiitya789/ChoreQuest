import { formatRupees, type CategoryDefinition } from '@/lib/expenses';
import type { MatrixRain } from '@/lib/matrixRain';
import type { Asteroid, Beam, Chip, Particle, Point, Ring, Shard } from '@/components/expenses/asteroidTypes';

// Stateless canvas drawing for Expense Asteroids. Every function paints from the
// data it is given, so the engine owns all state and this file owns all pixels.

const LABEL_FONT = '"Share Tech Mono", "JetBrains Mono", monospace';
const NUMBER_FONT = '"JetBrains Mono", ui-monospace, monospace';
const GREEN = '#00FF41';

export interface CannonView {
  category: CategoryDefinition;
  x: number;
  y: number;
  angle: number;
  pulse: number;
  recoil: number;
  suggested: boolean;
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

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  view: { width: number; height: number; ground: number; time: number; shieldStrength: number; rain: MatrixRain },
) {
  const { width, height, ground, time, shieldStrength, rain } = view;
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
  rain.draw(ctx, 0.28);

  // Surface below the shield line.
  const surface = ctx.createLinearGradient(0, ground, 0, height);
  surface.addColorStop(0, 'rgba(3, 30, 10, 0.95)');
  surface.addColorStop(1, 'rgba(0, 8, 2, 1)');
  ctx.fillStyle = surface;
  ctx.fillRect(-20, ground, width + 40, height - ground + 20);

  // Shield line: brighter with more shields left.
  ctx.save();
  ctx.strokeStyle =
    shieldStrength > 0 ? `rgba(0, 255, 65, ${0.25 + 0.55 * shieldStrength})` : 'rgba(248, 113, 113, 0.5)';
  ctx.lineWidth = 2;
  ctx.shadowColor = GREEN;
  ctx.shadowBlur = 12 * shieldStrength;
  ctx.setLineDash([10, 8]);
  ctx.lineDashOffset = -time * 20;
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.lineTo(width, ground);
  ctx.stroke();
  ctx.restore();
}

export function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid) {
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
    ctx.arc(Math.cos(crater.angle) * r * crater.dist, Math.sin(crater.angle) * r * crater.dist, r * crater.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Labels stay upright so they are readable while the rock spins.
  const fontSize = Math.max(11, Math.min(14, r * 0.24));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.font = `600 ${fontSize}px ${LABEL_FONT}`;
  ctx.fillStyle = '#E8FFEE';
  ctx.fillText(fitText(ctx, asteroid.expense.merchant, r * 1.65), 0, -fontSize * 0.55);
  ctx.font = `700 ${fontSize * 1.1}px ${NUMBER_FONT}`;
  ctx.fillStyle = GREEN;
  ctx.fillText(fitText(ctx, formatRupees(asteroid.expense.amount), r * 1.75), 0, fontSize * 0.85);
  ctx.restore();
}

export function drawEffects(
  ctx: CanvasRenderingContext2D,
  effects: { beams: Beam[]; rings: Ring[]; particles: Particle[]; shards: Shard[] },
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const beam of effects.beams) {
    ctx.globalAlpha = beam.life / beam.maxLife;
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

  for (const ring of effects.rings) {
    ctx.globalAlpha = ring.life * 0.7;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of effects.particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  for (const shard of effects.shards) {
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

export function drawCrosshair(ctx: CanvasRenderingContext2D, aim: Point, target: Asteroid | null, time: number) {
  const { x, y } = aim;
  const locked = target !== null && Math.hypot(target.x - x, target.y - y) < 10;
  const breathe = locked ? 0 : Math.sin(time * 4) * 2;
  const s = (target ? target.r + 14 : 24) + breathe;
  const arm = s * 0.38;

  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = locked ? GREEN : 'rgba(0, 255, 65, 0.5)';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = GREEN;
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

export function drawCannons(ctx: CanvasRenderingContext2D, cannons: CannonView[], time: number) {
  for (const { category, x, y, angle, pulse, recoil, suggested } of cannons) {
    if (suggested) {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(time * 6);
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
    ctx.rotate(angle);
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
    ctx.font = `600 12px ${LABEL_FONT}`;
    ctx.fillStyle = '#C9FFD5';
    ctx.fillText(category.label, x, y + 20);
    ctx.font = `500 11px ${NUMBER_FONT}`;
    ctx.fillStyle = category.color;
    ctx.fillText(category.key, x, y + 36);
    ctx.restore();
  }
}

export function drawChips(ctx: CanvasRenderingContext2D, chips: Chip[]) {
  for (const chip of chips) {
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
    ctx.font = `600 11px ${NUMBER_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D2FFDC';
    ctx.fillText(chip.label, x, y - 14);
    ctx.restore();
  }
}

export function drawScoreCounter(ctx: CanvasRenderingContext2D, filed: number) {
  ctx.save();
  ctx.font = `22px ${LABEL_FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = GREEN;
  ctx.shadowColor = 'rgba(0, 255, 65, 0.7)';
  ctx.shadowBlur = 10;
  ctx.fillText(`DESTROYED: ${filed}`, 16, 14);
  ctx.restore();
}

export function drawScanlines(ctx: CanvasRenderingContext2D, width: number, height: number) {
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
