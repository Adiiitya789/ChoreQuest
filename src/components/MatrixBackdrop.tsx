import { useEffect, useRef } from 'react';
import { MatrixRain } from '@/lib/matrixRain';

/** Full-page falling code behind the app, plus a CRT scanline overlay. */
export function MatrixBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rain = new MatrixRain(18, 18, [40, 120]);
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rain.resize(window.innerWidth, window.innerHeight);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      rain.draw(ctx, 0.5);
    };

    // Reduced motion: one still frame instead of animated rain.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw();
      return () => window.removeEventListener('resize', resize);
    }

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      rain.update(Math.min(0.05, (now - last) / 1000));
      last = now;
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(1,5,2,0.85)_75%)]" />
    </div>
  );
}
