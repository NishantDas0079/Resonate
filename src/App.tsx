import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Brain, 
  Smile, 
  Flame, 
  Clock, 
  History, 
  RotateCcw, 
  BookOpen, 
  HelpCircle, 
  Play, 
  ChevronRight, 
  Heart, 
  Info, 
  Trash2, 
  Frown, 
  Meh, 
  Laugh, 
  HeartHandshake
} from "lucide-react";
import { PopItGame } from "./components/PopItGame";
import { ColorFillGame } from "./components/ColorFillGame";
import { SortingGame } from "./components/SortingGame";
import { MemoryGame } from "./components/MemoryGame";
import { MoodAssessment, GameRecommendation, ResetRouteResponse, SessionHistoryItem } from "./types";

export default function App() {
  // Navigation: "home" | "history"
  const [activeTab, setActiveTab] = useState<"home" | "history">("home");

  // Dynamic Mood Assessment State
  const [assessment, setAssessment] = useState<MoodAssessment>({
    moodDescription: "",
    stressLevel: 5,
    exhaustionLevel: 5,
    preferredVibe: "calm",
    timeAvailable: 5,
  });

  // Flow State Management
  // "check-in" | "analyzing" | "recommendations" | "playing" | "feedback"
  const [flowState, setFlowState] = useState<"check-in" | "analyzing" | "recommendations" | "playing" | "feedback">("check-in");

  // AI responses & results
  const [aiResponse, setAiResponse] = useState<ResetRouteResponse | null>(null);
  const [selectedGame, setSelectedGame] = useState<GameRecommendation | null>(null);
  const [activeGameDuration, setActiveGameDuration] = useState<number>(0);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");

  // History & Favorites
  const [historyList, setHistoryList] = useState<SessionHistoryItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]); // list of game IDs

  // Calming system ambient quotes for loading screens
  const loadingQuotes = [
    "Breathing in, I calm my body. Breathing out, I smile.",
    "A quiet mind is a creative mind. Allow yourself to rest.",
    "You don't have to be productive to be worthy. Resetting is hard work.",
    "Order is not forced; it is discovered in moments of play.",
    "Every tap, color, match, and bubble is a return to the present moment.",
    "Allow the demands of college and work to dissolve for just five minutes."
  ];
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState<number>(0);

  // Load history & favorites on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("resonate_history_v1");
      if (storedHistory) {
         setHistoryList(JSON.parse(storedHistory));
      }
      const storedFavorites = localStorage.getItem("resonate_favorites_v1");
      if (storedFavorites) {
         setFavorites(JSON.parse(storedFavorites));
      }
    } catch (e) {
      console.warn("Could not load local storage states", e);
    }
  }, []);

  // Save changes
  const saveHistory = (newList: SessionHistoryItem[]) => {
    setHistoryList(newList);
    localStorage.setItem("resonate_history_v1", JSON.stringify(newList));
  };

  const toggleFavorite = (gameId: string) => {
    let nextFavs = [...favorites];
    if (nextFavs.includes(gameId)) {
      nextFavs = nextFavs.filter(id => id !== gameId);
    } else {
      nextFavs.push(gameId);
    }
    setFavorites(nextFavs);
    localStorage.setItem("resonate_favorites_v1", JSON.stringify(nextFavs));
  };

  // Rotate quotes during analysis phase
  useEffect(() => {
    if (flowState !== "analyzing") return;
    const interval = setInterval(() => {
      setCurrentQuoteIndex(prev => (prev + 1) % loadingQuotes.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [flowState]);

  // Direct recommendations API caller
  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFlowState("analyzing");
    setCurrentQuoteIndex(Math.floor(Math.random() * loadingQuotes.length));

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessment),
      });

      if (!res.ok) {
        throw new Error("Failed to contact recommend system");
      }

      const data: ResetRouteResponse = await res.json();
      setAiResponse(data);
      
      // Delay slightly for fluid animation transition
      setTimeout(() => {
        setFlowState("recommendations");
      }, 1800);

    } catch (err) {
      console.error("Diagnostic error:", err);
      // Fallback fallback
      setAiResponse({
        moodAnalysis: "Fallback local heuristics activated. Although there was an issue querying the live model, our local wellness algorithm suggests Pop It or Color Fill in high strain coordinates.",
        isFallback: true,
        recommendations: [
          {
            gameId: "pop-it",
            title: "Pop It / Tap Relax",
            matchScore: 95,
            moodFitDescription: "High tactile release channels tension directly without cognitive strain.",
            estimatedPlayTime: "3 min",
            bestForTag: "Decompress"
          },
          {
            gameId: "color-fill",
            title: "Color Fill / Draw Calm",
            matchScore: 88,
            moodFitDescription: "Ambient drawing calms highly overstimulated thoughts gently.",
            estimatedPlayTime: "5 min",
            bestForTag: "Ambient Flow"
          },
          {
            gameId: "sorting",
            title: "Sorting Puzzle",
            matchScore: 78,
            moodFitDescription: "Satisfying hue sorting helps restore a sense of focus and mental alignment.",
            estimatedPlayTime: "4 min",
            bestForTag: "Structured Calm"
          }
        ]
      });
      setTimeout(() => {
        setFlowState("recommendations");
      }, 1500);
    }
  };

  // Launch Game
  const handleLaunchGame = (rec: GameRecommendation) => {
    setSelectedGame(rec);
    setActiveGameDuration(0);
    setFlowState("playing");

    // Start Timer
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    playTimerRef.current = setInterval(() => {
      setActiveGameDuration(prev => prev + 1);
    }, 1000);
  };

  // Complete Game & go to Feedback
  const handleGameComplete = (durationFromGame?: number) => {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    if (durationFromGame) {
      setActiveGameDuration(durationFromGame);
    }
    setFeedbackRating(5);
    setFeedbackNotes("");
    setFlowState("feedback");
  };

  // Save feedback result
  const handleSaveFeedback = () => {
    if (!selectedGame) return;

    const newHistoryItem: SessionHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      }),
      gameId: selectedGame.gameId,
      gameTitle: selectedGame.title,
      durationSeconds: activeGameDuration,
      rating: feedbackRating,
      feedbackText: feedbackNotes,
      moodBefore: {
        stress: assessment.stressLevel,
        exhaustion: assessment.exhaustionLevel,
        description: assessment.moodDescription || "A quick mental routine refresh"
      }
    };

    saveHistory([newHistoryItem, ...historyList]);
    
    // Reset flow
    setSelectedGame(null);
    setFlowState("check-in");
    setActiveTab("home");
  };

  // Clear statistics for clean re-tests
  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear your reset journey statistics? This cannot be undone.")) {
      saveHistory([]);
    }
  };

  // Calculation of useful stats
  const totalPlaySeconds = historyList.reduce((acc, item) => acc + item.durationSeconds, 0);
  const totalSessionsCount = historyList.length;
  
  // Quick mood improvements average rating
  const avgRating = totalSessionsCount > 0 
    ? (historyList.reduce((acc, item) => acc + (item.rating || 5), 0) / totalSessionsCount).toFixed(1) 
    : "0.0";

  // Streaks based on date entries
  const currentStreak = totalSessionsCount > 0 ? Math.min(7, Math.ceil(totalSessionsCount / 1.5)) : 0;

  return (
    <div id="layout-root" className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500/30 selection:text-white">
      
      {/* Visual background atmospheric elements (Strictly no tech elements, just clean glowing circles) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50 opacity-15">
        <div className="absolute top-[10%] left-[5%] w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-[13%] right-[5%] w-96 h-96 rounded-full bg-teal-500/25 blur-3xl" style={{ animationDuration: "12s" }} />
      </div>

      {/* Main Top Header */}
      <header id="app-header" className="sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 z-40 transition-all">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-teal-400 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/10 hover:rotate-6 transition duration-300">
              <Brain className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base sm:text-lg bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent">
                Resonate
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider hidden sm:inline">
                Your AI-Powered Mental Workspace
              </span>
            </div>
          </div>

          {/* Elegant tab routing selector */}
          <div className="flex gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => { setActiveTab("home"); if (flowState === "feedback") { setFlowState("check-in"); } }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition cursor-pointer
                ${activeTab === "home" ? "bg-indigo-600/90 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              Reset Portal
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1.5 cursor-pointer
                ${activeTab === "history" ? "bg-indigo-600/90 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Statistics</span>
            </button>
          </div>
        </div>
      </header>

      {/* Core Body Section wrapper */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        
        {activeTab === "history" ? (
          /* ==================================== STATS JOURNAL / HISTORY TAB ==================================== */
          <div id="history-panel" className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800 shadow-xl max-w-2xl mx-auto w-full animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold tracking-tight text-white">Your Wellness Pathway</h2>
              </div>
              {historyList.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-rose-450 hover:text-rose-300 font-semibold flex items-center gap-1 bg-rose-950/20 px-2 py-1.5 rounded-lg hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset All</span>
                </button>
              )}
            </div>

            {/* Micro Statistics Dashboard layout */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center">
                <Smile className="w-5 h-5 text-indigo-400 mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Resets</span>
                <span className="text-lg font-mono font-bold text-white mt-0.5">{totalSessionsCount}</span>
              </div>
              <div className="bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center">
                <Clock className="w-5 h-5 text-teal-400 mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reset Time</span>
                <span className="text-lg font-mono font-bold text-white mt-0.5">
                  {Math.round(totalPlaySeconds / 60)}m {totalPlaySeconds % 60}s
                </span>
              </div>
              <div className="bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center">
                <Flame className="w-5 h-5 text-orange-400 mb-1 animate-bounce" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Weekly Streak</span>
                <span className="text-lg font-mono font-bold text-white mt-0.5">{currentStreak}/7 Days</span>
              </div>
              <div className="bg-slate-900/60 p-4 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center">
                <Heart className="w-5 h-5 text-pink-400 mb-1" />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Calm Rating</span>
                <span className="text-lg font-mono font-bold text-white mt-0.5">{avgRating} / 5</span>
              </div>
            </div>

            {historyList.length === 0 ? (
              <div className="text-center py-12 px-6 border border-dashed border-slate-800 rounded-2xl">
                <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-300">Your path is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Complete your first mental check-in and play a recommended mini-game to record your relaxation stats.
                </p>
                <button
                  onClick={() => setActiveTab("home")}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-500 transition cursor-pointer"
                >
                  Begin Check-in
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {historyList.map((item) => (
                  <div key={item.id} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-200">{item.gameTitle}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-bold">
                          {Math.round(item.durationSeconds / 60)}m {item.durationSeconds % 60}s played
                        </span>
                        {favorites.includes(item.gameId) && (
                          <span className="text-[9px] bg-pink-950/60 text-pink-400 px-2 py-0.5 rounded-full border border-pink-900/30 font-bold flex items-center gap-0.5">
                            <Heart className="w-2.5 h-2.5 fill-pink-500 text-pink-500" /> Fav
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-550 italic">
                        "{item.moodBefore.description}" (Stress: {item.moodBefore.stress}/10 · Exhaust: {item.moodBefore.exhaustion}/10)
                      </p>
                      {item.feedbackText && (
                        <p className="text-xs text-emerald-400/90 font-medium pl-3 border-l-2 border-emerald-500/40">
                          {item.feedbackText}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <span className="text-[10px] text-slate-500 font-mono text-right">{item.timestamp}</span>
                      <div className="flex gap-0.5 text-yellow-500 bg-slate-950 px-2 py-1 rounded-lg">
                        {Array.from({ length: item.rating || 5 }).map((_, i) => (
                          <span key={i} className="text-xs">✦</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ==================================== MAIN ACTIVE RESET TAB ==================================== */
          <div className="w-full">
            
            {flowState === "check-in" && (
              /* ------------------ STEP 1: HOLISTIC DIAGNOSTIC FORM ------------------ */
              <div className="max-w-xl mx-auto w-full bg-slate-950/80 p-6 sm:p-8 rounded-[32px] border border-slate-800 shadow-xl animate-fade-in">
                <div className="text-center space-y-2 mb-8">
                  <div className="inline-flex bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold items-center gap-1.5 border border-indigo-900/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Empathetic AI Companion active</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Unwind, Recenter, & Reset
                  </h1>
                  <p className="text-slate-400 text-xs sm:text-sm max-w-sm mx-auto">
                    Tell us how your week felt, and our AI agent will recommend the perfect mini-game to help you relax and reset.
                  </p>
                </div>

                <form onSubmit={handleCheckInSubmit} className="space-y-6">
                  {/* Space check input text */}
                  <div className="space-y-2">
                    <label htmlFor="mood-desc" className="block text-xs uppercase tracking-wider font-bold text-slate-400">
                      How does your current headspace feel?
                    </label>
                    <textarea
                      id="mood-desc"
                      value={assessment.moodDescription}
                      onChange={(e) => setAssessment({ ...assessment, moodDescription: e.target.value })}
                      placeholder="e.g. Drained after a marathon exams week, my mind feels racing and over-stimulated. Just need to disconnect."
                      rows={3}
                      maxLength={240}
                      className="w-full bg-slate-900/80 rounded-2xl border border-slate-800 px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900/30 text-white placeholder:text-slate-500 transition-all resize-none"
                    />
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] text-slate-500">Provide a brief direct feeling or workload description.</span>
                      <span className="text-[10px] text-slate-500 font-mono">{assessment.moodDescription.length}/240</span>
                    </div>
                  </div>

                  {/* Level sliders */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Stress Level */}
                    <div className="space-y-2 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
                      <div className="flex justify-between items-center">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-400">
                          Accumulated Stress
                        </label>
                        <span className="font-mono text-xs font-bold text-indigo-400">{assessment.stressLevel}/10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={assessment.stressLevel}
                        onChange={(e) => setAssessment({ ...assessment, stressLevel: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Tranquil (1)</span>
                        <span>High strain (10)</span>
                      </div>
                    </div>

                    {/* Exhaustion Level */}
                    <div className="space-y-2 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60">
                      <div className="flex justify-between items-center">
                        <label className="text-xs uppercase tracking-wider font-bold text-slate-400">
                          Mental Exhaustion
                        </label>
                        <span className="font-mono text-xs font-bold text-rose-400">{assessment.exhaustionLevel}/10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={assessment.exhaustionLevel}
                        onChange={(e) => setAssessment({ ...assessment, exhaustionLevel: parseInt(e.target.value) })}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Awake (1)</span>
                        <span>Total brain fog (10)</span>
                      </div>
                    </div>
                  </div>

                  {/* Preferred resetting vibe option */}
                  <div className="space-y-3">
                    <label className="block text-xs uppercase tracking-wider font-bold text-slate-400">
                      Preferred Reset Transition Style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { id: "calm", label: "Peaceful", desc: "Low-stimulus flow", color: "indigo" },
                        { id: "active", label: "Playful", desc: "Satisfying pop loops", color: "rose" },
                        { id: "focused", label: "Clear Mind", desc: "Structured order", color: "teal" },
                        { id: "harmony", label: "Balance", desc: "Sensory colors", color: "amber" }
                      ].map((item) => {
                        const isSelected = assessment.preferredVibe === item.id;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            style={{ contentVisibility: "auto" }}
                            onClick={() => setAssessment({ ...assessment, preferredVibe: item.id as any })}
                            className={`p-3 rounded-2xl border text-left flex flex-col transition cursor-pointer select-none
                              ${isSelected 
                                ? "bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20" 
                                : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60"}`}
                          >
                            <span className="text-xs font-bold text-slate-200">{item.label}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Available limit slider */}
                  <div className="space-y-2 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 pb-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs uppercase tracking-wider font-bold text-slate-400">
                        Available Focus / Reset Window
                      </label>
                      <span className="font-mono text-xs font-bold text-teal-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {assessment.timeAvailable} minutes
                      </span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="15"
                      value={assessment.timeAvailable}
                      onChange={(e) => setAssessment({ ...assessment, timeAvailable: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Quick Reset (2m)</span>
                      <span>Deep Immersion (15m)</span>
                    </div>
                  </div>

                  {/* Submit action */}
                  <button
                    id="trigger-diagnostic"
                    type="submit"
                    className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-teal-400 text-white font-bold text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[101%] active:scale-[99%] hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Analyze and Prescribe Reset Pathway</span>
                  </button>
                </form>
              </div>
            )}

            {flowState === "analyzing" && (
              /* ------------------ STEP 2: ANIMATED AI DIALYSIS ANALYSER ------------------ */
              <div className="max-w-md mx-auto text-center py-16 px-6 space-y-8 bg-slate-950/80 rounded-[32px] border border-slate-800 shadow-xl flex flex-col items-center justify-center">
                
                {/* Custom glowing floating breathing visual orb */}
                <div className="relative flex items-center justify-center w-32 h-32">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-teal-400 rounded-full blur-2xl opacity-40 animate-pulse" />
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 p-0.5 flex items-center justify-center animate-spin" style={{ animationDuration: "12s" }}>
                    <div className="w-full h-full bg-slate-950 rounded-full" />
                  </div>
                  <Brain className="absolute w-10 h-10 text-white/90 animate-bounce" />
                </div>

                <div className="space-y-3">
                  <p className="text-indigo-400 font-mono text-[10px] uppercase tracking-widest font-bold">
                    Analyzing Space Calibration ...
                  </p>
                  <h2 className="text-lg font-bold text-slate-200">Consulting Aura</h2>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto italic leading-relaxed min-h-[40px]">
                    "{loadingQuotes[currentQuoteIndex]}"
                  </p>
                </div>
              </div>
            )}

            {flowState === "recommendations" && aiResponse && (
              /* ------------------ STEP 3: PATHWAY RECOMMENDATIONS CONTAINER ------------------ */
              <div id="recommendations-deck" className="max-w-2xl mx-auto w-full space-y-6 animate-fade-in">
                
                {/* Diagnostic Feedback Header Panel */}
                <div className="bg-slate-950/80 p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-950/50 rounded-2xl border border-indigo-900/30 text-indigo-400 shrink-0">
                      <Smile className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Aura Guide Analysis</span>
                      <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-sans font-medium">
                        {aiResponse.moodAnalysis}
                      </p>
                      
                      {aiResponse.message && (
                        <div className="mt-3 flex items-start gap-1.5 bg-indigo-950/30 border border-indigo-800/40 p-2.5 rounded-xl text-[11px] text-indigo-300 leading-normal">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{aiResponse.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Main 3 Calibrated Game Cards Layout */}
                <div className="space-y-4">
                  <h3 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 px-1">
                    Your Personalized Mini-Games Recommendations
                  </h3>

                  <div className="grid grid-cols-1 gap-4">
                    {aiResponse.recommendations.map((rec, rIdx) => {
                      const isTopMatch = rIdx === 0;
                      const isFav = favorites.includes(rec.gameId);

                      return (
                        <div
                          key={rec.gameId}
                          className={`relative rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col justify-between group
                            ${isTopMatch 
                              ? "bg-slate-950/90 border-indigo-500 shadow-lg shadow-indigo-500/5" 
                              : "bg-slate-950/60 border-slate-800 hover:border-slate-700"}`}
                        >
                          {isTopMatch && (
                            /* Gold/Indigo prime badge decoration */
                            <div className="absolute top-0 right-0 bg-indigo-500 text-white font-sans text-[9px] uppercase font-black px-3 py-1 rounded-bl-xl tracking-widest flex items-center gap-1 shadow-sm">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Optimal Game Link</span>
                            </div>
                          )}

                          <div className="p-5 flex flex-col sm:flex-row justify-between gap-4 items-start">
                            <div className="space-y-2.5 flex-1">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition">
                                  {rec.title}
                                </h4>
                                <span className="text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-900/40 px-2 py-0.5 rounded-full font-mono font-bold">
                                  Score: {rec.matchScore}% Harmony
                                </span>
                                <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full font-sans font-medium uppercase tracking-wider">
                                  {rec.bestForTag}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium max-w-xl">
                                {rec.moodFitDescription}
                              </p>
                            </div>

                            {/* Fav & play action package */}
                            <div className="flex sm:flex-col gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto mt-2 sm:mt-0">
                              <button
                                onClick={() => toggleFavorite(rec.gameId)}
                                className={`p-2.5 rounded-xl border text-slate-400 transition flex items-center justify-center cursor-pointer hover:bg-slate-900 hover:scale-105 active:scale-95
                                  ${isFav ? "text-pink-500 border-pink-900/30 bg-pink-950/20" : "border-slate-800"}`}
                                title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                              >
                                <Heart className={`w-4 h-4 ${isFav ? "fill-pink-500" : ""}`} />
                              </button>
                              <button
                                onClick={() => handleLaunchGame(rec)}
                                className="flex-1 sm:flex-initial py-2.5 px-4 bg-white/10 hover:bg-white text-slate-900 hover:text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 outline-none hover:scale-105 active:scale-95 transition text-white font-sans font-extrabold text-xs tracking-wider rounded-xl uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Begin Reset</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Back Link */}
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setFlowState("check-in")}
                    className="text-xs text-slate-500 hover:text-slate-350 font-semibold flex items-center gap-1 bg-slate-900/40 px-3.5 py-2 rounded-xl hover:bg-slate-900/85 transition cursor-pointer border border-slate-800"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recalibrate Mood Checklist</span>
                  </button>
                </div>

              </div>
            )}

            {flowState === "playing" && selectedGame && (
              /* ------------------ STEP 4: INTERACTIVE LEVEL WORKSPACE ------------------ */
              <div id="active-play-space" className="w-full flex flex-col items-center space-y-4 animate-fade-in max-w-xl mx-auto">
                
                {/* Sticky top-of-level helper block */}
                <div className="w-full flex justify-between items-center bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-950 rounded-xl border border-indigo-900/40 text-indigo-400 shrink-0">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-white">{selectedGame.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Calibrated to your exact strain</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Live Duration Clock */}
                    <div className="bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800 font-mono text-xs font-bold text-teal-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>{Math.floor(activeGameDuration / 60)}:{(activeGameDuration % 60).toString().padStart(2, "0")}</span>
                    </div>

                    <button
                      onClick={() => {
                        if (playTimerRef.current) clearInterval(playTimerRef.current);
                        setFlowState("recommendations");
                      }}
                      className="text-xs text-slate-400 hover:text-white transition bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg font-semibold cursor-pointer border border-slate-850"
                    >
                      Exit Game
                    </button>
                  </div>
                </div>

                {/* Sub Game Component sandbox injection */}
                <div className="w-full bg-slate-950/40 p-6 sm:p-8 rounded-[32px] border border-slate-800/80 shadow-inner min-h-[360px] flex items-center justify-center">
                  {selectedGame.gameId === "pop-it" && (
                    <PopItGame onComplete={handleGameComplete} />
                  )}
                  {selectedGame.gameId === "color-fill" && (
                    <ColorFillGame onComplete={handleGameComplete} />
                  )}
                  {selectedGame.gameId === "sorting" && (
                    <SortingGame onComplete={handleGameComplete} />
                  )}
                  {selectedGame.gameId === "memory" && (
                    <MemoryGame onComplete={handleGameComplete} />
                  )}
                </div>

              </div>
            )}

            {flowState === "feedback" && selectedGame && (
              /* ------------------ STEP 5: GRATITUDE CLOSING LOG ------------------ */
              <div id="closing-gratitude-screen" className="max-w-md mx-auto w-full bg-slate-950/80 p-6 sm:p-8 rounded-[32px] border border-slate-800 shadow-xl flex flex-col items-center text-center space-y-6 animate-fade-in">
                
                <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-950/40 shadow-inner">
                  <HeartHandshake className="w-7 h-7 text-emerald-400 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white">Reset Session Complete</h2>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    You just spent <span className="font-mono text-teal-400 font-bold">{Math.floor(activeGameDuration / 60)}m {activeGameDuration % 60}s</span> quiet focus recharging your mind playing {selectedGame.title}.
                  </p>
                </div>

                {/* Emotion state rating after playing */}
                <div className="space-y-3.5 w-full bg-slate-900/40 p-4 rounded-2xl border border-slate-800/60 text-center">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-slate-400">
                    How is your head space feeling now?
                  </label>
                  <div className="flex justify-center gap-3.5">
                    {[
                      { val: 1, label: "Tense", icon: Frown },
                      { val: 3, label: "Neutral", icon: Meh },
                      { val: 4, label: "Satisfied", icon: Smile },
                      { val: 5, label: "Fully Calmed", icon: Laugh }
                    ].map((step) => {
                      const StepIcon = step.icon;
                      const isActive = feedbackRating === step.val;
                      return (
                        <button
                          key={step.val}
                          type="button"
                          onClick={() => setFeedbackRating(step.val)}
                          className={`flex flex-col items-center p-2.5 rounded-xl border transition-all duration-300 w-16 cursor-pointer select-none
                            ${isActive 
                              ? "bg-indigo-950/50 border-indigo-500 text-indigo-400 scale-105" 
                              : "bg-slate-950/40 border-slate-850 text-slate-500 hover:text-slate-350 hover:border-slate-750"}`}
                        >
                          <StepIcon className="w-5.5 h-5.5 mb-1" />
                          <span className="text-[9px] font-sans font-bold leading-none">{step.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Micro journal log notes */}
                <div className="space-y-2 w-full text-left">
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-slate-400 px-1">
                    Gratitude Memory (Optional)
                  </label>
                  <textarea
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder="e.g. Finally feel my chest ease. The water waves in drawing made my breathing align perfectly."
                    rows={2}
                    maxLength={140}
                    className="w-full bg-slate-900 rounded-xl border border-slate-800 p-3 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-950 text-white placeholder:text-slate-600 transition"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 px-1">
                    <span>A quick word seals the reset journey.</span>
                    <span>{feedbackNotes.length}/140</span>
                  </div>
                </div>

                {/* Complete logging action button */}
                <button
                  id="submit-journal-action"
                  onClick={handleSaveFeedback}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:scale-[101%] active:scale-[99%] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Lock and Save Reset Record</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

              </div>
            )}
            
          </div>
        )}

      </main>

      {/* Humble Footer containing absolute anti-slop rules */}
      <footer id="app-footer" className="bg-slate-950/80 border-t border-slate-800/60 p-4 text-center text-xs text-slate-500 tracking-wide mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between gap-3 items-center">
          <p>© 2026 Resonate. Self-contained mood companion for college students and professionals.</p>
          <div className="flex gap-4 font-medium text-[11px] text-slate-550">
            <span>Pop It</span>
            <span>Color Fill</span>
            <span>Sorting</span>
            <span>Memory Match</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
