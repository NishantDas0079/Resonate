import React, { useState, useRef, useEffect } from "react";
import { Check, RotateCcw, Volume2, VolumeX, Sparkles } from "lucide-react";

interface SortingGameProps {
  onComplete: (durationSeconds: number) => void;
}

// Pastel color codes
const BALL_COLORS = {
  R: { hex: "#FB7185", label: "Rose" },      // Rose
  P: { hex: "#C084FC", label: "Lavender" },  // Purple
  M: { hex: "#34D399", label: "Mint" },      // Mint Green
  O: { hex: "#FB923C", label: "Amber" },      // Amber Orange
};

type BallColorKey = keyof typeof BALL_COLORS;

// Standard initial sorted puzzle states that can be solved and reset
const PUZZLE_LEVELS: BallColorKey[][] = [
  ["R", "P", "M", "R"], // Tube 1
  ["P", "M", "R", "P"], // Tube 2
  ["M", "R", "P", "M"], // Tube 3
  [],                  // Tube 4 (Empty helper)
  [],                  // Tube 5 (Empty helper)
];

export function SortingGame({ onComplete }: SortingGameProps) {
  const [tubes, setTubes] = useState<BallColorKey[][]>([]);
  const [selectedTubeIdx, setSelectedTubeIdx] = useState<number | null>(null);
  const [movesCount, setMovesCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const startTime = useRef<number>(Date.now());

  const tubeCapacity = 4;

  // Initialize a randomized solvable-ish puzzle, or reset
  const initGame = () => {
    // Generate a beautiful, solvable arrangement of 12 balls (3 colors x 4 balls each) into 5 tubes
    const colors: BallColorKey[] = ["R", "P", "M", "O"];
    let pool: BallColorKey[] = [];
    colors.forEach(c => {
      for (let i = 0; i < 3; i++) pool.push(c); // 3 of each color
    });

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const initialTubes: BallColorKey[][] = [[], [], [], [], []];
    // Fill first 4 tubes with 3 balls each
    for (let t = 0; t < 4; t++) {
      for (let b = 0; b < 3; b++) {
        const item = pool.pop();
        if (item) initialTubes[t].push(item);
      }
    }
    // The 5th remains completely empty as a utility vial
    setTubes(initialTubes);
    setSelectedTubeIdx(null);
    setMovesCount(0);
    setHasWon(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  const playHarmonicPitch = (frequencyMultiplier: number) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Pure beautiful E-major pentatonic sound anchor
      const baseHz = 261.63; // middle C
      osc.frequency.setValueAtTime(baseHz * frequencyMultiplier, ctx.currentTime);

      gain.connect(ctx.destination);
      osc.connect(gain);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.warn("Web audio blocked on user interaction");
    }
  };

  const checkWinCondition = (currentTubes: BallColorKey[][]) => {
    // Win if for every tube:
    // - it is completely empty, OR
    // - it is at its filled capacity (or at least contains all the balls of the same color present in the state)
    // and all balls in that tube are identical.
    let solvedGroupsCount = 0;
    let totalBallsCount = 0;

    currentTubes.forEach(t => {
      if (t.length > 0) {
        totalBallsCount += t.length;
        const allSame = t.every(b => b === t[0]);
        // A single filled container can hold up to 3 balls
        if (allSame && t.length === 3) {
          solvedGroupsCount++;
        }
      }
    });

    // 4 colors of 3 balls each = 12 total balls.
    // If we have 4 solved groups, we win!
    if (solvedGroupsCount === 4) {
      setHasWon(true);
      playHarmonicPitch(2.5); // high spark chime!
    }
  };

  const handleTubeClick = (tubeIdx: number) => {
    if (hasWon) return;

    if (selectedTubeIdx === null) {
      // Pick up a ball
      if (tubes[tubeIdx].length === 0) return; // empty tube
      setSelectedTubeIdx(tubeIdx);
      playHarmonicPitch(1.2);
    } else {
      // Trying to drop at a tube
      if (selectedTubeIdx === tubeIdx) {
        // Deselect
        setSelectedTubeIdx(null);
        playHarmonicPitch(0.9);
        return;
      }

      const sourceTube = tubes[selectedTubeIdx];
      const targetTube = tubes[tubeIdx];

      // Rules:
      // 1. Target cannot be full (max size 3 for our 3-ball solvable rule)
      if (targetTube.length >= 3) {
        setSelectedTubeIdx(null);
        return;
      }

      const ballToMove = sourceTube[sourceTube.length - 1];

      // 2. Can drop if target is empty, or if its top matches our ball
      if (targetTube.length === 0 || targetTube[targetTube.length - 1] === ballToMove) {
        const nextTubes = tubes.map((t, idx) => {
          if (idx === selectedTubeIdx) {
            const copy = [...t];
            copy.pop();
            return copy;
          }
          if (idx === tubeIdx) {
            return [...t, ballToMove];
          }
          return t;
        });

        setTubes(nextTubes);
        setMovesCount(prev => prev + 1);
        setSelectedTubeIdx(null);
        playHarmonicPitch(1.6);
        checkWinCondition(nextTubes);
      } else {
        // Drop is invalid, auto deselect source or let them select the target as a source instead
        if (targetTube.length > 0) {
          setSelectedTubeIdx(tubeIdx); // switch selection
          playHarmonicPitch(1.2);
        } else {
          setSelectedTubeIdx(null);
        }
      }
    }
  };

  const handleStopSession = () => {
    const end = Date.now();
    const duration = Math.round((end - startTime.current) / 1000);
    onComplete(duration === 0 ? 1 : duration);
  };

  return (
    <div id="sorting-game-root" className="flex flex-col items-center max-w-md mx-auto h-full justify-between">
      {/* Game statistics */}
      <div className="w-full flex justify-between items-center bg-teal-50/70 p-3 rounded-2xl border border-teal-100 mb-4 shadow-xs">
        <div className="flex flex-col">
          <span className="font-sans text-xs font-semibold text-teal-600 uppercase tracking-widest">Thought Order</span>
          <span className="font-mono text-base font-bold text-slate-800">{movesCount} moves</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition border border-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={initGame}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 transition border border-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Suffle Ball Puzzle"
          >
            <RotateCcw className="w-4 h-4 text-amber-500" />
          </button>
        </div>
      </div>

      {hasWon && (
        <div className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-center mb-4 flex flex-col items-center gap-1 animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="font-bold text-sm">Perfectly Sorted Thoughts!</span>
          </div>
          <p className="text-xs text-emerald-700">All tubes are pure and balanced. Take a deep breath.</p>
        </div>
      )}

      {/* Glass tubes display board */}
      <div className="relative w-full py-8 px-4 bg-slate-50 rounded-3xl border border-slate-150 flex justify-center items-end gap-3 min-h-[220px]">
        {tubes.map((tube, tubeIdx) => {
          const isSelected = selectedTubeIdx === tubeIdx;
          const isFull = tube.length >= 3;

          return (
            <div
              key={tubeIdx}
              onClick={() => handleTubeClick(tubeIdx)}
              className={`relative flex flex-col justify-end items-center w-14 h-36 rounded-b-2xl rounded-t-lg bg-white/60 border-2 transition-all duration-300 p-1 gap-1 cursor-pointer select-none
                ${isSelected 
                  ? "border-emerald-500 bg-white shadow-lg -translate-y-2 ring-2 ring-emerald-200" 
                  : "border-slate-200 hover:border-slate-350 hover:bg-white"}`}
            >
              {/* Selective liquid background reflections for realism */}
              <div className="absolute inset-x-0.5 bottom-0 top-6 bg-slate-100/30 rounded-b-xl pointer-events-none" />

              {/* Balls in Tube, rendered bottom to top */}
              {tube.map((ball, bIdx) => {
                const spec = BALL_COLORS[ball];
                return (
                  <div
                    key={bIdx}
                    style={{ backgroundColor: spec.hex }}
                    className="w-10 h-10 rounded-full shadow-[inset_-3px_-3px_6px_rgba(0,0,0,0.15),_inset_3px_3px_6px_rgba(255,255,255,0.4),_0_2px_4px_rgba(0,0,0,0.1)] flex items-center justify-center text-[10px] text-white font-sans font-bold select-none"
                    title={spec.label}
                  >
                    <span className="opacity-15">✦</span>
                  </div>
                );
              })}

              {tube.length === 0 && (
                <div className="text-[10px] text-slate-400 text-center uppercase tracking-widest absolute bottom-4">
                  void
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full flex flex-col items-center mt-6">
        <p className="text-sm text-slate-500 font-sans text-center mb-4 max-w-sm">
          Tap a tube to lift its top ball, then tap another tube to place it. Match colors inside tubes to restore order in your headspace.
        </p>

        <button
          id="sorting-puzzle-complete"
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
