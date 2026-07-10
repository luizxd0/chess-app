export type UserRole = "FREE" | "PREMIUM" | "ADMIN";

export function isPremiumOrAdmin(role: UserRole): boolean {
  return role === "PREMIUM" || role === "ADMIN";
}

export function canAccessLearn(role: UserRole): boolean {
  return isPremiumOrAdmin(role);
}

export function canAccessAnalysis(role: UserRole): boolean {
  return isPremiumOrAdmin(role);
}

export function canUseAdminTips(role: UserRole): boolean {
  return role === "ADMIN";
}

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface BotDefinition {
  id: number;
  name: string;
  title: string;
  stockfishSkill: number;
  uciElo: number;
  unlockedByDefault: boolean;
  avatarSlug: string;
}

export const GM_BOTS: BotDefinition[] = [
  { id: 1, name: "Martin", title: "The Beginning", stockfishSkill: 1, uciElo: 250, unlockedByDefault: true, avatarSlug: "martin" },
  { id: 2, name: "Elani", title: "Casual Player", stockfishSkill: 2, uciElo: 400, unlockedByDefault: false, avatarSlug: "elani" },
  { id: 3, name: "Aron", title: "Novice", stockfishSkill: 3, uciElo: 700, unlockedByDefault: false, avatarSlug: "aron" },
  { id: 4, name: "Emir", title: "Apprentice", stockfishSkill: 4, uciElo: 1000, unlockedByDefault: false, avatarSlug: "emir" },
  { id: 5, name: "Sven", title: "Intermediate", stockfishSkill: 5, uciElo: 1100, unlockedByDefault: false, avatarSlug: "sven" },
  { id: 6, name: "Nelson", title: "Club Regular", stockfishSkill: 6, uciElo: 1300, unlockedByDefault: false, avatarSlug: "nelson" },
  { id: 7, name: "Antonio", title: "Strong Amateur", stockfishSkill: 7, uciElo: 1500, unlockedByDefault: false, avatarSlug: "antonio" },
  { id: 8, name: "Isabel", title: "Tactical Player", stockfishSkill: 8, uciElo: 1600, unlockedByDefault: false, avatarSlug: "isabel" },
  { id: 9, name: "Wally", title: "Advanced", stockfishSkill: 9, uciElo: 1800, unlockedByDefault: false, avatarSlug: "wally" },
  { id: 10, name: "Li", title: "Expert", stockfishSkill: 10, uciElo: 2000, unlockedByDefault: false, avatarSlug: "li" },
  { id: 11, name: "Fatima", title: "Candidate", stockfishSkill: 11, uciElo: 2050, unlockedByDefault: false, avatarSlug: "fatima" },
  { id: 12, name: "Noam", title: "Master", stockfishSkill: 12, uciElo: 2200, unlockedByDefault: false, avatarSlug: "noam" },
  { id: 13, name: "Nora", title: "Senior Master", stockfishSkill: 13, uciElo: 2250, unlockedByDefault: false, avatarSlug: "nora" },
  { id: 14, name: "Francis", title: "International Master", stockfishSkill: 14, uciElo: 2300, unlockedByDefault: false, avatarSlug: "francis" },
  { id: 15, name: "Danny", title: "Chess.com Director", stockfishSkill: 15, uciElo: 2500, unlockedByDefault: false, avatarSlug: "danny" },
  { id: 16, name: "Levy", title: "Gotham Chess", stockfishSkill: 16, uciElo: 2600, unlockedByDefault: false, avatarSlug: "levy" },
  { id: 17, name: "Botez", title: "Streamer", stockfishSkill: 17, uciElo: 2700, unlockedByDefault: false, avatarSlug: "botez" },
  { id: 18, name: "Hikaru", title: "Speed Legend", stockfishSkill: 18, uciElo: 3000, unlockedByDefault: false, avatarSlug: "hikaru" },
  { id: 19, name: "Komodo", title: "Engine Master", stockfishSkill: 19, uciElo: 3100, unlockedByDefault: false, avatarSlug: "komodo" },
  { id: 20, name: "Magnus", title: "World Champion", stockfishSkill: 20, uciElo: 3200, unlockedByDefault: false, avatarSlug: "magnus" },
];

export const RAPID_BASE_MS = 10 * 60 * 1000;
export const RAPID_INCREMENT_MS = 0;
export const RAPID_TIME_CONTROL = "10+0";
export const FIRST_MOVE_GRACE_MS = 30 * 1000;

export interface GameClockState {
  whiteTimeMs: number;
  blackTimeMs: number;
  incrementMs: number;
  lastTickAt: string;
}

export type MoveClassification =
  | "brilliant"
  | "best"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface CoachMoveReview {
  moveNumber: number;
  san: string;
  classification: MoveClassification;
  cpLoss: number;
  evalBefore: number;
  evalAfter: number;
  bestMoveSan: string;
  commentary: string;
  arrows: Array<{ from: string; to: string; color: "green" | "blue" | "red" }>;
}

export interface OpeningLineSummary {
  id: string;
  familyName: string;
  name: string;
  eco: string;
  movesSan: string[];
  plyCount: number;
}

export * from "./api.js";
