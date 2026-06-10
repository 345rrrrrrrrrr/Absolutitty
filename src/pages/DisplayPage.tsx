import { useEffect, useMemo, useRef, useState } from 'react';
import { runForDisplay } from '../mlog/vm';
import DisplayCanvas from '../components/DisplayCanvas';

const SAMPLE = `# radar dish demo — try the animate toggle!
draw clear 16 18 24 0 0 0
draw color 60 70 90 255 0 0
draw stroke 2 0 0 0 0 0
draw linePoly 40 40 24 30 0 0
draw linePoly 40 40 24 20 0 0
draw linePoly 40 40 24 10 0 0
op mod angle @second 360
op mul angle angle 60
draw color 132 244 145 160 0 0
op cos dx angle
op mul dx dx 30
op sin dy angle
op mul dy dy 30
op add x2 40 dx
op add y2 40 dy
draw line 40 40 x2 y2 0 0
draw color 255 211 127 255 0 0
draw poly 40 40 12 3 0 0
drawflush display1`;

export default function DisplayPage() {
  const [source, setSource] = useState(() => sessionStorage.getItem('displayCode') ?? SAMPLE);
  const [size, setSize] = useState<80 | 176>(80);
  const [frameIndex, setFrameIndex] = useState(0);
  const [animate, setAnimate] = useState(false);
  const [clock, setClock] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    sessionStorage.removeItem('displayCode');
  }, []);

  useEffect(() => {
    if (!animate) return;
    let mounted = true;
    const startedAt = performance.now();
    const loop = () => {
      if (!mounted) return;
      setClock(performance.now() - startedAt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  const result = useMemo(
    () => runForDisplay(source, { timeOffsetMs: animate ? clock : 0 }),
    [source, animate ? clock : 0], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const frames = result.frames;
  const safeIndex = Math.min(frameIndex, Math.max(0, frames.length - 1));
  const frame = frames[safeIndex] ?? [];

  return (
    <div>
      <h1 className="mt0">Display Preview</h1>
      <p className="muted" style={{ maxWidth: 740 }}>
        An approximate simulator for logic display code: it runs <span className="mono">set / op / jump /
        draw</span> and shows each <span className="mono">drawflush</span> as a frame. Sensors and other
        world instructions read as 0.
      </p>
      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 420px', minWidth: 320 }}>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={22}
            spellCheck={false}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <DisplayCanvas frame={frame} size={size} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className={`btn small${size === 80 ? '' : ' secondary'}`} onClick={() => setSize(80)}>80×80</button>
            <button className={`btn small${size === 176 ? '' : ' secondary'}`} onClick={() => setSize(176)}>176×176</button>
            <label className="row" style={{ gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.target.checked)} />
              animate (@second advances)
            </label>
          </div>
          {frames.length > 1 && (
            <div className="row" style={{ marginTop: 8 }}>
              <span className="muted" style={{ fontSize: 13 }}>frame {safeIndex + 1}/{frames.length}</span>
              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={safeIndex}
                onChange={(e) => setFrameIndex(Number(e.target.value))}
                style={{ width: 180 }}
              />
            </div>
          )}
          {result.printOutput && (
            <div className="card" style={{ marginTop: 10, maxWidth: 420 }}>
              <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>message block output</div>
              <div className="mono" style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>
                {result.printOutput.replace(/\\n/g, '\n').replace(/\[[^\]]*\]/g, '')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
