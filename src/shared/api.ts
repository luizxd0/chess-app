export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: string;
  };
}

export interface ApiError {
  error: string;
  code?: string;
}

export interface CreateBotGameRequest {
  botId: number;
  color: "white" | "black";
}

export interface CreateOpeningPracticeRequest {
  lineId: string;
  botId: number;
  color: "white" | "black";
  continueAfterOpening: boolean;
}

export interface TipResponse {
  best: { from: string; to: string; san: string };
  secondBest: { from: string; to: string; san: string };
  eval: number;
}

export interface GameReviewResponse {
  gameId: string;
  moves: import("./index.js").CoachMoveReview[];
  accuracy: { white: number; black: number };
}
