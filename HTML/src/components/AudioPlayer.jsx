import { useState, useRef, useEffect, useCallback } from 'react';

export function AudioPlayer({ src, title = 'Аудио-объяснение от Gemini' }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [w, setW] = useState(0);
  const rafRef = useRef(null);

  // Responsive width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Generate fake waveform bars (deterministic from src string)
  const bars = useRef(null);
  if (!bars.current) {
    let seed = 0;
    for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) & 0xffff;
    const rand = () => { seed = (seed * 16807 + 1) % 2147483647; return seed / 2147483647; };
    bars.current = Array.from({ length: 80 }, () => 0.15 + rand() * 0.85);
  }

  const drawWaveform = useCallback(() => {
    if (!w || !canvasRef.current) return;
    const c = canvasRef.current;
    const H = 36;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = H * dpr;
    c.style.width = w + 'px';
    c.style.height = H + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, H);

    const numBars = bars.current.length;
    const barW = Math.max(2, (w - numBars) / numBars);
    const gap = 1.5;
    const progress = duration > 0 ? currentTime / duration : 0;

    for (let i = 0; i < numBars; i++) {
      const x = i * (barW + gap);
      const h = bars.current[i] * (H - 4);
      const y = (H - h) / 2;
      const barProgress = (i + 0.5) / numBars;

      if (barProgress <= progress) {
        ctx.fillStyle = '#da7756'; // accent — played
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.12)'; // unplayed
      }
      ctx.beginPath();
      ctx.roundRect(x, y, barW, h, 1);
      ctx.fill();
    }
  }, [w, currentTime, duration]);

  useEffect(() => { drawWaveform(); }, [drawWaveform]);

  // Animation loop for smooth progress
  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); }
    else { a.play(); }
    setPlaying(!playing);
  };

  const seek = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frac = x / rect.width;
    if (audioRef.current && duration > 0) {
      audioRef.current.currentTime = frac * duration;
      setCurrentTime(frac * duration);
    }
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-3 md:p-4">
      <p className="text-xs text-text-dim mb-2">{title}</p>
      <div className="flex items-center gap-3">
        {/* Play button */}
        <button
          onClick={toggle}
          className="w-10 h-10 shrink-0 rounded-full bg-accent text-white flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Waveform + time */}
        <div className="flex-1 min-w-0" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="cursor-pointer block"
            onClick={seek}
          />
          <div className="flex justify-between text-[10px] text-text-dim mt-0.5">
            <span>{fmt(currentTime)}</span>
            <span>{duration > 0 ? fmt(duration) : '—:——'}</span>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => { if (!playing) setCurrentTime(e.target.currentTime); }}
      />
    </div>
  );
}
