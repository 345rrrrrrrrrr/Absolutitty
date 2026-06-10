import { useEffect, useRef } from 'react';
import type { DrawCall } from '../mlog/vm';

const SCALE_TARGET = 400;

export default function DisplayCanvas({ frame, size }: { frame: DrawCall[]; size: 80 | 176 }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // displays start black; origin is bottom-left in mlog → flip Y
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.translate(0, size);
    ctx.scale(1, -1);

    let stroke = 1;
    for (const call of frame) {
      switch (call.op) {
        case 'clear':
          ctx.fillStyle = `rgb(${call.r},${call.g},${call.b})`;
          ctx.fillRect(0, 0, size, size);
          break;
        case 'color': {
          const c = `rgba(${call.r},${call.g},${call.b},${(call.a ?? 255) / 255})`;
          ctx.fillStyle = c;
          ctx.strokeStyle = c;
          break;
        }
        case 'stroke':
          stroke = call.width;
          break;
        case 'line':
          ctx.lineWidth = stroke;
          ctx.beginPath();
          ctx.moveTo(call.x, call.y);
          ctx.lineTo(call.x2, call.y2);
          ctx.stroke();
          break;
        case 'rect':
          ctx.fillRect(call.x, call.y, call.w, call.h);
          break;
        case 'lineRect':
          ctx.lineWidth = stroke;
          ctx.strokeRect(call.x, call.y, call.w, call.h);
          break;
        case 'poly':
        case 'linePoly': {
          const sides = Math.max(3, Math.floor(call.sides));
          ctx.beginPath();
          for (let i = 0; i <= sides; i++) {
            const angle = ((call.rotation + (i * 360) / sides) * Math.PI) / 180;
            const px = call.x + call.radius * Math.cos(angle);
            const py = call.y + call.radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          if (call.op === 'poly') ctx.fill();
          else { ctx.lineWidth = stroke; ctx.stroke(); }
          break;
        }
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(call.x1, call.y1);
          ctx.lineTo(call.x2, call.y2);
          ctx.lineTo(call.x3, call.y3);
          ctx.closePath();
          ctx.fill();
          break;
        case 'image': {
          // game sprites aren't bundled — draw a labeled placeholder box
          const s2 = call.size / 2;
          ctx.lineWidth = 1;
          ctx.strokeRect(call.x - s2, call.y - s2, call.size, call.size);
          ctx.save();
          ctx.scale(1, -1); // unflip for text
          ctx.font = `${Math.max(4, Math.min(7, call.size / 3))}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(call.image.replace('@', '').slice(0, 8), call.x, -(call.y - s2 - 1));
          ctx.restore();
          break;
        }
        case 'print': {
          ctx.save();
          ctx.scale(1, -1);
          ctx.font = '6px monospace';
          ctx.textAlign = call.align.toLowerCase().includes('right') ? 'right' : call.align === 'center' ? 'center' : 'left';
          const lines = call.text.split('\\n');
          lines.forEach((line, i) => ctx.fillText(line, call.x, -(call.y - i * 7)));
          ctx.restore();
          break;
        }
      }
    }
  }, [frame, size]);

  const cssSize = Math.round(SCALE_TARGET / size) * size;
  return (
    <div className="display-canvas-wrap">
      <canvas ref={ref} width={size} height={size} style={{ width: cssSize, height: cssSize }} />
    </div>
  );
}
