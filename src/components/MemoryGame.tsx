import React, { useState, useRef, useEffect } from "react";
import { Check, RotateCcw, Volume2, VolumeX, Sparkles, Brain } from "lucide-react";

interface MemoryGameProps {
  onComplete: (durationSeconds: number) => void;
}

// Nature/Mindfulness Symbols with matching descriptions
const WELLNESS_CARDS = [
  { symbol: "🌸", label: "Lotus Blossom" },
  { symbol: "🌊", label: "Calming Wave" },
  { symbol: "🍃", label: "Gently Floating Leaf" },
  { symbol: "☀️", label: "Morning Sun" },
  { symbol: "🧘", label: "Deeper Mindfulness" },
  { symbol: "🕯️", label: "Soft Candlelight" },
  { symbol: "🌲", label: "Tranquil Forest" },
  { symbol: "🔮", label: "Healing Aura" },
];

interface CardState {
  id: number;
  symbol: string;
  label: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export function MemoryGame({ onComplete }: MemoryGameProps) {
  const [cards, setCards] = useState<CardState[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [turnsCount, setTurnsCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasWon, setHasWon] = useState<boolean>(false);
  const startTime = useRef<number>(Date.now());

  const initDeck = () => {
    // Generate 16 card array (8 pairs)
    const deck: CardState[] = [];
    let curId = 0;

    // Concat pairs
    WELLNESS_CARDS.forEach(card => {
      deck.push({ id: curId++, symbol: card.symbol, label: card.label, isFlipped: false, isMatched: false });
      deck.push({ id: curId++, symbol: card.symbol, label: card.label, isFlipped: false, isMatched: false });
    });

    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setSelectedIndices([]);
    setTurnsCount(0);
    setHasWon(false);
  };

  useEffect(() => {
    initDeck();
  }, []);

  const playSynthesizerHarmonic = (freq: number) => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);

      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    } catch (e) {
      console.warn("Audio Context matching play is blocked");
    }
  };

  const handleCardClick = (idx: number) => {
    if (cards[idx].isFlipped || cards[idx].isMatched || selectedIndices.length >= 2 || hasWon) return;

    const nextCards = [...cards];
    nextCards[idx].isFlipped = true;
    setCards(nextCards);

    const nextSelected = [...selectedIndices, idx];
    setSelectedIndices(nextSelected);

    // Play tactile soft chime note for flipping
    const pentatonicFrequencies = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    const flipFreq = pentatonicFrequencies[idx % pentatonicFrequencies.length];
    playSynthesizerHarmonic(flipFreq);

    if (nextSelected.length === 2) {
      setTurnsCount(prev => prev + 1);
      const [firstIdx, secondIdx] = nextSelected;

      if (cards[firstIdx].symbol === cards[secondIdx].symbol) {
        // MATCH FOUND!
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setSelectedIndices([]);

          // High harmonic match celebrate chord using Web Audio
          playSynthesizerHarmonic(659.25);
          
          // Check if game completely finished
          const allMatched = matchedCards.every(c => c.isMatched);
          if (allMatched) {
            setHasWon(true);
            playSynthesizerHarmonic(880.00); // peak reset harmony
          }
        }, 400);
      } else {
        // MISMATCH, auto flip back
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[firstIdx].isFlipped = false;
          resetCards[secondIdx].isFlipped = false;
          setCards(resetCards);
          setSelectedIndices([]);
          // short quiet low note
          playSynthesizerHarmonic(196.00);
        }, 1000);
      }
    }
  };

  const handleStopSession = () => {
    const end = Date.now();
    const duration = Math.round((end - startTime.current) / 1000);
    onComplete(duration === 0 ? 1 : duration);
  };

  return (
    <div id="memory-game-root" className="flex flex-col items-center max-w-md mx-auto h-full justify-between">
      {/* Game statistics header */}
      <div className="w-full flex justify-between items-center bg-indigo-50/70 p-3 rounded-2xl border border-indigo-150 mb-4 shadow-xs">
        <div className="flex flex-col">
          <span className="font-sans text-xs font-semibold text-indigo-600 uppercase tracking-widest">Active Mind</span>
          <span className="font-mono text-base font-bold text-slate-800">{turnsCount} turns</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-100 transition border border-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Toggle Resonance Scale"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
          <button
            onClick={initDeck}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-100 transition border border-slate-100 hover:scale-105 active:scale-95 cursor-pointer"
            title="Suffle deck card configurations"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {hasWon && (
        <div className="w-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-center mb-4 flex flex-col items-center gap-1 animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            <span className="font-bold text-sm">Mindful Focus Refreshed!</span>
          </div>
          <p className="text-xs text-emerald-700">All matching nature elements have been harmonized perfectly.</p>
        </div>
      )}

      {/* Grid of memory match card items */}
      <div className="grid grid-cols-4 gap-3 w-full max-w-[340px] aspect-square bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner">
        {cards.map((c, idx) => {
          const isOpen = c.isFlipped || c.isMatched;

          return (
            <button
              key={idx}
              onClick={() => handleCardClick(idx)}
              className={`relative aspect-square w-full rounded-2xl flex items-center justify-center transition-all duration-350 transform font-sans text-2xl select-none focus:outline-none cursor-pointer
                ${isOpen 
                  ? "bg-white rotate-y-180 shadow-md border-2 border-emerald-200" 
                  : "bg-gradient-to-tr from-sky-400/90 to-indigo-400/90 hover:scale-105 shadow-md border-2 border-white text-white active:scale-95"}`}
            >
              {isOpen ? (
                <div className="flex flex-col items-center">
                  <span>{c.symbol}</span>
                  <span className="text-[7px] text-slate-400 uppercase tracking-widest font-mono font-semibold block mt-0.5 max-w-[50px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {c.label}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Brain className="w-5 h-5 opacity-40 animate-pulse text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="w-full flex flex-col items-center mt-6">
        <p className="text-sm text-slate-500 font-sans text-center mb-4 max-w-sm">
          Select cards to flip and reveal calming icons. Find matching pairs to refresh and lock your sensory working memory.
        </p>

        <button
          id="memory-complete"
          onClick={handleStopSession}
          className="w-full max-w-xs py-3 px-6 bg-gradient-to-r from-emerald-50 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-sans font-semibold rounded-2xl shadow-md transition hover:scale-[102%] active:scale-[98%] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>I feel relaxed, complete reset</span>
        </button>
      </div>
    </div>
  );
}
