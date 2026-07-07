import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Router
  app.post("/api/recommend", async (req: any, res: any) => {
    try {
      const { moodDescription, stressLevel, exhaustionLevel, preferredVibe, timeAvailable } = req.body;
      const stress = parseInt(stressLevel) || 5;
      const exhaustion = parseInt(exhaustionLevel) || 5;

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        // Return fallback but flag it so client shows a message pointing to Settings > Secrets
        const fallback = getFallbackRecommendations(moodDescription, stress, exhaustion, preferredVibe);
        return res.json({
          ...fallback,
          isFallback: true,
          message: "Using local wellness heuristics. Add your GEMINI_API_KEY in Settings > Secrets for personalized AI generation!"
        });
      }

      // Initialize GoogleGenAI lazily
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Formulate a soothing mental reset recommendations schema based on:
- User's feeling today: "${moodDescription || "Stressed and tired from a busy week."}"
- Stress level: ${stress}/10
- Exhaustion level: ${exhaustion}/10
- Preferred Vibe: "${preferredVibe || "calming"}"
- Available reset time: ${timeAvailable || 5} minutes

Rank and select exactly 3 built-in games (from Pop It, Color Fill, Sorting Puzzle, Memory Flip) and craft an emotional diagnostic analysis. Speak directly, validation-first, warmly like an empathetic mental reset companion.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are "Aura", an emotionally intelligent, empathetic guide and mental wellness companion. 
Your job is to read how a user is feeling after their week, check their stress (0-10) and exhaustion (0-10) levels, and recommend exactly 3 of our 4 built-in calming mini-games.

Built-in Games Available:
1. "pop-it" (Pop It / Tap Relax): Best for high physical tension or mindless relief. Mindless, rewarding bubble-popping. Perfect for low mental energy and high frustration.
2. "color-fill" (Color Fill / Draw Calm): Best for over-stimulated minds wanting a smooth creative flow. Drawing lines and relaxing coloring patterns. Reduces tension.
3. "sorting" (Sorting Puzzle): Best for sorting chaotic thoughts. Grouping colors/patterns gently. Provides light structured focus without penalty.
4. "memory" (Quick Match / Memory Flip): Best for waking up a sleepy, fatigued mind. Playful round-based card matching. Provides a gentle focus reboot.

You MUST prioritize analyzing their emotional state and output a highly empathetic, modern, soothing analysis. Talk directly, supportively, and warmly to college students or working professionals.
Format your response exactly according to the requested JSON schema.`,
          temperature: 1.0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              moodAnalysis: {
                type: Type.STRING,
                description: "An empathetic, short 2-3 sentence validation of their state and how we can reset today. Speak directly, call them 'friend' or 'you' with great warmth."
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    gameId: {
                      type: Type.STRING,
                      description: "Must be exactly one of: 'pop-it', 'color-fill', 'sorting', 'memory'"
                    },
                    title: {
                      type: Type.STRING,
                      description: "Human friendly title, e.g. 'Pop It', 'Color Fill', 'Sorting Puzzle', 'Memory Flip'"
                    },
                    matchScore: {
                      type: Type.INTEGER,
                      description: "An integer between 60 and 100 representing how perfectly this fits their emotional state"
                    },
                    moodFitDescription: {
                      type: Type.STRING,
                      description: "A soothing explanation of how this game's mechanics specifically help heal or reset their exact mental state."
                    },
                    estimatedPlayTime: {
                      type: Type.STRING,
                      description: "Suggested playtime, e.g. '3-5 min' or '5-7 min'"
                    },
                    bestForTag: {
                      type: Type.STRING,
                      description: "Short 2-3 word highlight tag, e.g. 'Mindless Release', 'Soothing Flow', 'Structured Calm', 'Gentle Focus Reset'"
                    }
                  },
                  required: ["gameId", "title", "matchScore", "moodFitDescription", "estimatedPlayTime", "bestForTag"]
                }
              }
            },
            required: ["moodAnalysis", "recommendations"]
          }
        }
      });

      const responseText = response.text || "{}";
      const resultObj = JSON.parse(responseText.trim());
      res.json({
        ...resultObj,
        isFallback: false
      });

    } catch (error: any) {
      console.error("Gemini API error:", error);
      const fallback = getFallbackRecommendations(req.body.moodDescription, parseInt(req.body.stressLevel) || 5, parseInt(req.body.exhaustionLevel) || 5, req.body.preferredVibe);
      res.status(200).json({
        ...fallback,
        isFallback: true,
        message: "Offline heuristic fallback activated due to API invocation limits."
      });
    }
  });

  // Serve static UI / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production path
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: any, res: any) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

function getFallbackRecommendations(moodDescription: string, stress: number, exhaustion: number, vibe: string) {
  const games = [
    {
      gameId: "pop-it",
      title: "Pop It / Tap Relax",
      bestForTag: "Tactile Decompression",
      descHighStress: "Popping bubble shapes lets you physically channel accumulated somatic tension without needing any cognitive load.",
      descLowStress: "A mindless, tactile interface to keep your fingers moving while your brain drifts into a state of total ease.",
    },
    {
      gameId: "color-fill",
      title: "Color Fill / Draw Calm",
      bestForTag: "Ambient Flow",
      descHighStress: "Flowing colors allow your mind's internal dialogue to quiet down, guiding you into a tranquil visual sandbox.",
      descLowStress: "A soft, expressive creative outlet where colors harmonize gently with your tap movements.",
    },
    {
      gameId: "sorting",
      title: "Sorting Puzzle",
      bestForTag: "Structured Calm",
      descHighStress: "Gently sorting mixed hues lets you re-order external structures, helping quiet down internal anxiety and racing thoughts.",
      descLowStress: "A quiet, satisfying sorting sequence that gives you a small sense of accomplishment and calm completion.",
    },
    {
      gameId: "memory",
      title: "Memory Flip",
      bestForTag: "Gentle Focus Reset",
      descHighStress: "A quick, lightweight match game that keeps your attention gently anchored in the active present, snapping you out of stress loops.",
      descLowStress: "A playful focus booster to recheck your working memory with a low-pressure, satisfying flip mechanism.",
    }
  ];

  const scored = games.map(g => {
    let score = 75;
    let desc = g.descLowStress;

    if (g.gameId === "pop-it") {
      score += (exhaustion * 2) + (stress * 1);
      if (stress > 5) desc = g.descHighStress;
    } else if (g.gameId === "color-fill") {
      score += (stress * 2.5) - (exhaustion * 0.5);
      if (stress > 4) desc = g.descHighStress;
    } else if (g.gameId === "sorting") {
      score += (stress * 1.5) + (5 - Math.abs(exhaustion - 5));
      if (stress > 4) desc = g.descHighStress;
    } else if (g.gameId === "memory") {
      score += (10 - exhaustion) * 2;
      if (stress > 4) desc = g.descHighStress;
    }

    score = Math.max(65, Math.min(98, Math.round(score)));

    return {
      gameId: g.gameId,
      title: g.title,
      matchScore: score,
      moodFitDescription: desc,
      estimatedPlayTime: g.gameId === "pop-it" ? "2-4 min" : g.gameId === "color-fill" ? "4-6 min" : g.gameId === "sorting" ? "3-5 min" : "2-3 min",
      bestForTag: g.bestForTag,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);

  let moodNarrative = "Based on your customized fatigue/stress indicators, we've designed a weekend reset route. ";
  if (stress > 7) {
    moodNarrative += "Since you are experiencing intense pressure, we recommend calming tactile loops to lower your sympathetic response.";
  } else if (exhaustion > 7) {
    moodNarrative += "With peak cognitive exhaustion active, low-friction sensory grids or visual flows will grant you a quiet reset space.";
  } else {
    moodNarrative += "Your indicators suggest a comfortable zone. Gentle structured focus and color flows will leave you feeling delightfully grounded.";
  }

  return {
    moodAnalysis: moodNarrative,
    recommendations: scored.slice(0, 3)
  };
}

startServer();
