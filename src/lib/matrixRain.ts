const GLYPHS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789₹$+-*=<>';

export function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

interface Column {
  x: number;
  y: number;
  speed: number;
  glyphs: string[];
}

/**
 * Falling-code columns in the style of a Matrix screen. Each column is a bright
 * head glyph trailed by fading ones; glyphs flicker as the column falls.
 */
export class MatrixRain {
  private columns: Column[] = [];
  private width = 0;
  private height = 0;

  constructor(
    private readonly cell: number,
    private readonly trail: number,
    private readonly speedRange: [number, number],
  ) {}

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const count = Math.ceil(width / this.cell);
    if (count === this.columns.length) return;
    this.columns = Array.from({ length: count }, (_, i) => this.makeColumn(i, true));
  }

  update(dt: number) {
    for (const [i, column] of this.columns.entries()) {
      column.y += column.speed * dt;
      if (Math.random() < dt * 6) {
        column.glyphs[Math.floor(Math.random() * column.glyphs.length)] = randomGlyph();
      }
      if (column.y - this.trail * this.cell > this.height) this.columns[i] = this.makeColumn(i, false);
    }
  }

  draw(ctx: CanvasRenderingContext2D, alpha: number) {
    ctx.save();
    ctx.font = `${this.cell - 2}px "Share Tech Mono", "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const column of this.columns) {
      for (let j = 0; j < this.trail; j++) {
        const y = column.y - j * this.cell;
        if (y < -this.cell || y > this.height) continue;
        const fade = 1 - j / this.trail;
        ctx.fillStyle = j === 0 ? `rgba(210, 255, 220, ${alpha})` : `rgba(0, 255, 65, ${alpha * fade * 0.8})`;
        ctx.fillText(column.glyphs[j], column.x, y);
      }
    }
    ctx.restore();
  }

  private makeColumn(index: number, scatter: boolean): Column {
    const [min, max] = this.speedRange;
    return {
      x: index * this.cell + this.cell / 2,
      y: scatter ? Math.random() * this.height : -Math.random() * this.height * 0.5,
      speed: min + Math.random() * (max - min),
      glyphs: Array.from({ length: this.trail }, randomGlyph),
    };
  }
}
