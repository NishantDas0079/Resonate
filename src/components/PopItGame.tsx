import React, { useState, useRef } from "react";
import { Check, RotateCcw, Volume2, VolumeX, Sparkles } from "lucide-react";

interface PopItGameProps {
  onComplete: (durationSeconds: number) => void;
}

export function PopItGame({ onComplete }: PopItGameProps) {
  // 6x6 grid of bubbles
  const cols = 6;
  const rows = 6;
  const total = cols * rows;

  const [poppedStates, setPoppedStates] = useState<boolean[]>(new Array(total).fill(false));
  const [totalPops, setTotalPops] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const startTime = useRef<number>(Date.now());
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  // Web Audio API pop sound synthesizer
  const playPopSound = (index: number) => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Warm organic pop: start at around 150-250Hz, sweep up quickly to 400Hz then down, or sharp decline
      const baseFreq = 180 + (index % 6) * 35; 
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio Context blocked or not supported yet", e);
    }
  };

  const handleBubbleClick = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    const isAlreadyPopped = poppedStates[index];
    
    // Toggle pop state
    const nextStates = [...poppedStates];
    nextStates[index] = !isAlreadyPopped;
    setPoppedStates(nextStates);
    setTotalPops(prev => prev + 1);

    // Audio pop
    playPopSound(index);

    // Create custom particle effects centered around click coordinates
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Gradient of warm/cool reset pastels
    const colors = ["#F87171", "#FB7185", "#F472B6", "#C084FC", "#93C5FD", "#34D399"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const id = Date.now() + Math.random();
    setParticles(prev => [...prev, { id, x, y, color: randomColor }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 600);

    // Check if the whole board is popped to congratulate the user gently
    const allPopped = nextStates.every(state => state === true);
    if (allPopped) {
      setTimeout(() => {
        // Auto unpop after a second for endless satisfaction
        setPoppedStates(new Array(total).fill(false));
      }, 1000);
    }
  };

  const handleReset = () => {
    setPoppedStates(new Array(total).fill(false));
  };

  const handleStopSession = () => {
    const end = Date.now();
    const duration = Math.round((end - startTime.current) / 1000);
    onComplete(duration === 0 ? 1 : duration);
  };

  return (
    <div id="pop-it-game-root" className="flex flex-col items-center max-w-md mx-auto h-full justify-between">
      {/* Game Header Controls */}
      <div className="w-full flex justify-between items-center bg-gray-50/80 p-3 rounded-2xl border border-gray-100 mb-4 shadow-xs">
        <div className="flex flex-col">
          <span className="font-sans text-xs font-semibold text-gray-500 uppercase tracking-widest">Tactile Feedback</span>
          <span className="font-mono text-base font-bold text-gray-800">{totalPops} pops</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-600 transition border border-gray-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Toggle Pop Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-600 transition border border-gray-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Reset Grid"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </div>

      {/* Pop It Board Container */}
      <div className="relative w-full aspect-square max-w-[340px] bg-gradient-to-br from-indigo-50/40 via-purple-50/30 to-pink-50/40 p-4 rounded-3xl shadow-xl border-4 border-white flex flex-col justify-center items-center">
        {/* Soft background decor */}
        <div className="absolute inset-2 bg-white/70 rounded-[22px] shadow-inner -z-10" />

        {/* Bubble Grid */}
        <div className="grid grid-cols-6 gap-3 w-full h-full max-w-[300px] max-h-[300px]">
          {poppedStates.map((isPopped, idx) => {
            // Row-based soft color gradients (Sunset pastel transition)
            const rowIdx = Math.floor(idx / cols);
            const rowColors = [
              "from-rose-400/90 to-rose-300/80",   // Row 1
              "from-orange-300/90 to-orange-200/80", // Row 2
              "from-amber-300/90 to-amber-200/80",  // Row 3
              "from-emerald-300/90 to-emerald-200/80", // Row 4
              "from-sky-300/90 to-sky-200/80",     // Row 5
              "from-indigo-300/90 to-indigo-200/80", // Row 6
            ];
            const activeBg = rowColors[rowIdx];

            return (
              <button
                key={idx}
                onClick={(e) => handleBubbleClick(e, idx)}
                style={{ contentVisibility: "auto" }}
                className={`relative aspect-square w-full rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none cursor-pointer group select-none
                  ${isPopped 
                    ? "bg-gray-200/60 shadow-inner scale-90 border-t border-gray-300/40" 
                    : `bg-gradient-to-b ${activeBg} shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),_inset_0_-2px_4px_rgba(0,0,0,0.2),_inset_0_2px_4px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 active:shadow-inner`
                  }`}
              >
                {/* Pop Indicator line */}
                {!isPopped && (
                  <span className="absolute inset-1 rounded-full border border-white/20 pointer-events-none group-active:opacity-0 transition-opacity" />
                )}
                {isPopped && (
                  <span className="block w-2.5 h-2.5 rounded-full bg-inner shadow-inner bg-white/10" />
                )}
              </button>
            );
          })}
        </div>

        {/* Particles render zone */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
          {particles.map(p => (
            <div
              key={p.id}
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                left: p.x - 4,
                top: p.y - 4,
                backgroundColor: p.color,
                animationDuration: "0.6s",
              }}
            />
          ))}
        </div>
      </div>

      <div className="w-full flex flex-col items-center mt-6">
        <p className="text-sm text-gray-500 font-sans tracking-wide text-center mb-4 max-w-sm">
          Press any bubble to pop it. Let your thoughts settle with every soft tactile tap. You are in total control.
        </p>

        <button
          id="pop-it-complete"
          onClick={handleStopSession}
          className="w-full max-w-xs py-3 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-sans font-semibold rounded-2xl shadow-md transition hover:scale-[102%] active:scale-[98%] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>I feel relaxed, complete reset</span>
        </button>
      </div>
    </div>
  );
}
