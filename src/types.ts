export interface GameRecommendation {
  gameId: "pop-it" | "color-fill" | "sorting" | "memory";
  title: string;
  matchScore: number;
  moodFitDescription: string;
  estimatedPlayTime: string;
  bestForTag: string;
}

export interface MoodAssessment {
  moodDescription: string;
  stressLevel: number;
  exhaustionLevel: number;
  preferredVibe: "calm" | "active" | "focused" | "harmony";
  timeAvailable: number;
}

export interface ResetRouteResponse {
  moodAnalysis: string;
  recommendations: GameRecommendation[];
  isFallback: boolean;
  message?: string;
}

export interface SessionHistoryItem {
  id: string;
  timestamp: string;
  gameId: "pop-it" | "color-fill" | "sorting" | "memory";
  gameTitle: string;
  durationSeconds: number;
  rating?: number; // feedback rating structure 1-5
  feedbackText?: string;
  moodBefore: {
    stress: number;
    exhaustion: number;
    description: string;
  };
}
