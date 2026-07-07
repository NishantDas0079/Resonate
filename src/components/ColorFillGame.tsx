import React, { useState, useRef, useEffect } from "react";
import { Check, Sparkles, Paintbrush, RefreshCw, AudioLines } from "lucide-react";

interface ColorFillGameProps {
  onComplete: (durationSeconds: number) => void;
}

export function ColorFillGame({ onComplete }: ColorFillGameProps) {
  const [activeMode, setActiveMode] = useState<"mandala" | "zensand">("mandala");
  const [selectedPalette, setSelectedPalette] = useState<number>(0);
  const [soundScaleEnabled, setSoundScaleEnabled] = useState<boolean>(true);
  const startTime = useRef<number>(Date.now());

  // Mandalas are made of a grid of geometric shapes
  // Representing 5 inner circles and structural sector petals
  const totalMandalaSectors = 42;
  const [mandalaColors, setMandalaColors] = useState<string[]>(
    new Array(totalMandalaSectors).fill("#f1f5f9") // starts warm off-white/gray
  );

  // Soothing color palettes
  const palettes = [
    {
      name: "Twilight Calm",
      colors: ["#312E81", "#4F46E5", "#818CF8", "#A78BFA", "#C084FC", "#F472B6"],
    },
    {
      name: "Forest Springs",
      colors: ["#064E3B", "#059669", "#34D399", "#A7F3D0", "#6EE7B7", "#0D9488"],
    },
    {
      name: "Peach Sunset",
      colors: ["#7C2D12", "#EA580C", "#F97316", "#FB923C", "#FDBA74", "#FFedd5"],
    },
  ];

  const playChimeHarmonic = (idx: number) => {
    if (!soundScaleEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Pentatonic scale frequencies for soothing harmony
      const pentatonic = [220, 246.94, 277.18, 329.63, 369.99, 440, 493.88, 554.37, 659.25];
      const baseFreq = pentatonic[idx % pentatonic.length];

      // Play soft chime (sine waves blended with soft tri-wave)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime); // fifth overtone helper

      gainNode.connect(ctx.destination);
      osc1.connect(gainNode);
      osc2.connect(gainNode);

      // Super gentle fadeout
      gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05); // low volume peak
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2); // long tail

      osc1.start();
      osc2.start();

      osc1.stop(ctx.currentTime + 1.3);
      osc2.stop(ctx.currentTime + 1.1);
    } catch (e) {
      console.warn("Harmonic audio context initialized but blocked", e);
    }
  };

  // Color Sector of mandala
  const handleSectorClick = (sectorIndex: number) => {
    const currentActiveColor = palettes[selectedPalette].colors[sectorIndex % palettes[selectedPalette].colors.length];
    const newColors = [...mandalaColors];
    newColors[sectorIndex] = currentActiveColor;
    setMandalaColors(newColors);
    playChimeHarmonic(sectorIndex);
  };

  const handleResetMandala = () => {
    setMandalaColors(new Array(totalMandalaSectors).fill("#f1f5f9"));
  };

  // ZEN DRAW GLOW SAND ENGINE
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const trailPointsRef = useRef<{ x: number; y: number; age: number; maxAge: number; color: string }[]>([]);

  useEffect(() => {
    if (activeMode !== "zensand" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Ensure accurate sizing on canvas coordinate grid
    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    };
    handleResize();

    let animationId: number;

    const render = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const scale = window.devicePixelRatio;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(scale, scale);

      // Starry backing vibe
      ctx.fillStyle = "rgba(15, 23, 42, 0.05)"; // subtle trail blend
      ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

      // Render glowing trail segments with decay
      const points = trailPointsRef.current;
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.age++;

        const ratio = 1 - p.age / p.maxAge;
        if (ratio <= 0) {
          points.splice(i, 1);
          i--;
          continue;
        }

        // Draw glowing point circle
        ctx.beginPath();
        const baseGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16 * ratio);
        baseGradient.addColorStop(0, p.color);
        baseGradient.addColorStop(0.5, p.color + "90");
        baseGradient.addColorStop(1, "transparent");

        ctx.fillStyle = baseGradient;
        ctx.arc(p.x, p.y, 16 * ratio, 0, Math.PI * 2);
        ctx.fill();

        // Connect points with thin line for fluid ink flow
        if (i > 0 && points[i - 1]) {
          const prev = points[i - 1];
          ctx.beginPath();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4 * ratio;
          ctx.globalAlpha = ratio * 0.7;
          ctx.lineCap = "round";
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [activeMode]);

  const addPoint = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Pick a relaxing pastel paint
    const currentPalette = palettes[selectedPalette].colors;
    const color = currentPalette[Math.floor(Math.random() * currentPalette.length)];

    trailPointsRef.current.push({
      x,
      y,
      age: 0,
      maxAge: 70, // frame duration lifetimes of drawing trail
      color,
    });

    // Subtly play scale matching coordinate mapping
    if (trailPointsRef.current.length % 5 === 0) {
      const idx = Math.floor((y / rect.height) * 9);
      playChimeHarmonic(idx);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    addPoint(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    addPoint(e.clientX, e.clientY);
  };

  const handleMouseUpOrLeave = () => {
    isDrawingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    if (e.touches[0]) {
      addPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (e.touches[0]) {
      addPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleStopSession = () => {
    const end = Date.now();
    const duration = Math.round((end - startTime.current) / 1000);
    onComplete(duration === 0 ? 1 : duration);
  };

  return (
    <div id="color-fill-game-root" className="flex flex-col items-center max-w-md mx-auto h-full justify-between">
      {/* Game Mode Selector & Audio Toggle */}
      <div className="w-full bg-slate-50 p-2 rounded-2xl border border-slate-100 mb-4 flex flex-col gap-2 shadow-xs">
        <div className="flex justify-between items-center px-1">
          <div className="flex bg-slate-250 p-1 rounded-xl">
            <button
              onClick={() => setActiveMode("mandala")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer
                ${activeMode === "mandala" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Paintbrush className="w-3.5 h-3.5 text-indigo-500" />
              <span>Mandala Tap</span>
            </button>
            <button
              onClick={() => setActiveMode("zensand")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer
                ${activeMode === "zensand" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Zen Sands</span>
            </button>
          </div>
          <button
            onClick={() => setSoundScaleEnabled(!soundScaleEnabled)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 transition border border-slate-150 hover:scale-105 active:scale-95 cursor-pointer"
            title="Toggle Resonance Scale"
          >
            <AudioLines className={`w-4 h-4 ${soundScaleEnabled ? "text-indigo-500" : "text-slate-400"}`} />
          </button>
        </div>

        {/* Color Palette Row Select */}
        <div className="flex justify-between items-center gap-2 border-t border-slate-200/50 pt-2 px-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Palette</div>
          <div className="flex gap-2">
            {palettes.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPalette(idx)}
                className={`py-1 px-2.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border
                  ${selectedPalette === idx 
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                <div className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.colors[0] }} />
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.colors[2] }} />
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.colors[4] }} />
                </div>
                <span className="hidden sm:inline text-[11px]">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative w-full aspect-square max-w-[340px] bg-slate-900 rounded-3xl overflow-hidden shadow-xl border-4 border-white">
        {activeMode === "mandala" ? (
          /* Mandala Shape Canvas utilizing highly styled CSS layout shapes */
          <div className="absolute inset-0 bg-slate-50 flex items-center justify-center p-4">
            <button
              onClick={handleResetMandala}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 transition shadow-xs hover:rotate-45 cursor-pointer"
              title="Clear Mandala Paint"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <div className="relative w-full h-full max-w-[280px] max-h-[280px] aspect-square rounded-full border border-slate-200 p-2 flex items-center justify-center">
              {/* Outer boundary circle ornament */}
              <div className="absolute inset-1 rounded-full border border-slate-100 pointer-events-none" />

              {/* Mandala sectors grid arranged circularly */}
              <div className="grid grid-cols-6 gap-2 w-full h-full p-2">
                {mandalaColors.map((col, sIdx) => {
                  return (
                    <button
                      key={sIdx}
                      onClick={() => handleSectorClick(sIdx)}
                      style={{ backgroundColor: col }}
                      className="rounded-full w-full aspect-square hover:scale-105 active:scale-95 transition-all duration-300 shadow-xs cursor-pointer border border-slate-200 flex items-center justify-center text-[9px] text-slate-300 font-mono"
                    >
                      <span className="opacity-0 hover:opacity-100 transition-opacity">✦</span>
                    </button>
                  );
                })}
              </div>

              {/* Center lotus blossom core trigger */}
              <button
                onClick={() => handleSectorClick(0)}
                className="absolute w-20 h-20 rounded-full border-4 border-white shadow-md flex items-center justify-center transition hover:scale-110 cursor-pointer"
                style={{ backgroundColor: mandalaColors[0] }}
              >
                <div className="w-8 h-8 rounded-full border border-white/40 animate-pulse bg-white/20" />
              </button>
            </div>
          </div>
        ) : (
          /* Custom Neon draw glowing sands canvas */
          <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUpOrLeave}
              className="w-full h-full cursor-crosshair touch-none"
            />
            <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
              <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-2 py-1 rounded-md border border-indigo-800/40 font-mono uppercase tracking-widest leading-none">
                Slide fingers to weave stardust trails
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full flex flex-col items-center mt-6">
        <p className="text-sm text-slate-500 font-sans text-center mb-4 max-w-sm">
          {activeMode === "mandala"
            ? "Tap circular plates to compose custom harmonics and color layouts."
            : "Draw smooth glowing lines across the stardust sand. They vanish softly, granting quiet reflection."}
        </p>

        <button
          id="color-fill-complete"
          onClick={handleStopSession}
          className="w-full max-w-xs py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-sans font-semibold rounded-2xl shadow-md transition hover:scale-[102%] active:scale-[98%] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>I feel refreshed, complete reset</span>
        </button>
      </div>
    </div>
  );
}
