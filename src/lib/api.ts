import { Chess } from "chess.js";
import { isPremiumOrAdmin, type UserRole, GM_BOTS } from "@/shared";
import { Engine } from "./engine";

export interface User {
  id: string;
  username: string;
  role: UserRole;
  avatarUrl?: string | null;
}

const engine = new Engine();
const gamesStore = new Map<string, any>();

function getGameOrThrow(id: string) {
  const g = gamesStore.get(id);
  if (!g) throw new Error("Game not found");
  return g;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method || "GET";
  
  if (path === "/auth/me") {
    const user = localStorage.getItem("user");
    if (user) return { user: JSON.parse(user) } as T;
    // Auto login
    const newUser = { id: "1", username: "player", role: "ADMIN" as UserRole };
    localStorage.setItem("user", JSON.stringify(newUser));
    return { user: newUser } as T;
  }
  
  if (path === "/auth/login" || path === "/auth/register") {
    const user = { id: "1", username: "player", role: "ADMIN" as UserRole };
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", "fake-token");
    return { token: "fake-token", user } as T;
  }
  
  if (path === "/bots/progress") {
    const progress = localStorage.getItem("bots_progress");
    const defeatedBotIds = progress ? JSON.parse(progress).defeatedBotIds : [];
    const bots = GM_BOTS.map(b => ({
       ...b,
       unlocked: b.unlockedByDefault || defeatedBotIds.includes(b.id - 1),
       defeated: defeatedBotIds.includes(b.id)
    }));
    return { bots } as T;
  }
  
  if (path === "/games/opening-practice" && method === "POST") { const body = init?.body ? JSON.parse(init.body as string) : {}; const gameId = "game-" + Date.now(); const chess = new Chess(); gamesStore.set(gameId, { id: gameId, botId: body.botId, playerColor: body.color || "white", fen: chess.fen(), pgn: chess.pgn(), status: "ACTIVE", openingPhaseComplete: true, mode: "PRACTICE", whiteTimeMs: 10 * 60 * 1000, blackTimeMs: 10 * 60 * 1000, timeControl: "10+0", clockStarted: false, chess }); return { gameId } as T; }
  if (path === "/openings/families") { return { families: [{ id: "1", name: "Italian Game", eco: "C50" }] } as T; }
  if (path.match(/^\/openings\/families\/.+\/lines$/)) { return { family: { name: "Italian Game" }, lines: [{ id: "1", name: "Giuoco Piano", eco: "C50", movesSan: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"], movesUci: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"] }] } as T; }
  if (path === "/bots") {
    return { bots: GM_BOTS } as T;
  }
  
  if (path === "/games/bot" && method === "POST") {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const gameId = "game-" + Date.now();
    const chess = new Chess();
    const game = {
      id: gameId,
      botId: body.botId,
      playerColor: body.color || "white",
      fen: chess.fen(),
      pgn: chess.pgn(),
      status: "ACTIVE",
      openingPhaseComplete: true,
      mode: "BOT",
      whiteTimeMs: 10 * 60 * 1000,
      blackTimeMs: 10 * 60 * 1000,
      timeControl: "10+0",
      clockStarted: false,
      chess
    };
    gamesStore.set(gameId, game);
    
    if (game.playerColor === "black") {
      setTimeout(() => {
        api(`/games/${gameId}/bot-move`, { method: "POST" }).catch(console.error);
      }, 500);
    }
    
    return { gameId } as T;
  }
  
  const gameMatch = path.match(/^\/games\/([^\/]+)(?:\/(.*))?$/);
  if (gameMatch) {
    const gameId = gameMatch[1];
    const action = gameMatch[2];
    
    if (action === "bot-move" && method === "POST") {
      const g = getGameOrThrow(gameId);
      if (g.status !== "ACTIVE") return { game: g } as T;
      
      const bot = GM_BOTS.find(b => b.id === g.botId);
      if (bot) engine.setSkillLevel(bot.stockfishSkill);
      
      const bestMove = await engine.evaluate(g.chess.fen(), 10);
      if (bestMove) {
        g.chess.move(bestMove);
        g.fen = g.chess.fen();
        g.pgn = g.chess.pgn();
        if (g.chess.isGameOver()) {
          g.status = "COMPLETED";
          g.result = g.chess.isCheckmate() ? "Checkmate" : "Draw";
        }
      }
      return { game: Object.assign({}, g, { chess: undefined }) } as T;
    }
    
    if (action === "move" && method === "POST") {
      const g = getGameOrThrow(gameId);
      if (g.status !== "ACTIVE") throw new Error("Game over");
      
      const body = init?.body ? JSON.parse(init.body as string) : {};
      g.clockStarted = true;
      
      try {
        g.chess.move({ from: body.from, to: body.to, promotion: body.promotion || "q" });
        g.fen = g.chess.fen();
        g.pgn = g.chess.pgn();
        
        if (g.chess.isGameOver()) {
          g.status = "COMPLETED";
          g.result = g.chess.isCheckmate() ? "Checkmate" : "Draw";
          if (g.chess.isCheckmate()) {
            const prog = JSON.parse(localStorage.getItem("bots_progress") || '{"defeatedBotIds":[]}');
            if (!prog.defeatedBotIds.includes(g.botId)) {
               prog.defeatedBotIds.push(g.botId);
               localStorage.setItem("bots_progress", JSON.stringify(prog));
            }
          }
        } else {
          setTimeout(() => {
            api(`/games/${gameId}/bot-move`, { method: "POST" }).catch(console.error);
          }, 500);
        }
        
        return { game: Object.assign({}, g, { chess: undefined }), botMoves: [] } as T;
      } catch (e) {
        throw new Error("Invalid move");
      }
    }
    
    if (action === "resign" && method === "POST") {
      const g = getGameOrThrow(gameId);
      g.status = "COMPLETED";
      g.result = "Resigned";
      return { game: Object.assign({}, g, { chess: undefined }) } as T;
    }

    if (action === "flag" && method === "POST") {
      const g = getGameOrThrow(gameId);
      g.status = "COMPLETED";
      g.result = "Timeout";
      return { game: Object.assign({}, g, { chess: undefined }) } as T;
    }
    
    if (action === "review" && method === "GET") { return { moves: [], accuracy: { white: 50, black: 50 } } as T; }
    if (!action && method === "GET") {
      const g = getGameOrThrow(gameId);
      return Object.assign({}, g, { chess: undefined }) as T;
    }
    
    if (action === "tip" && method === "POST") {
       return { best: { from: "e2", to: "e4", san: "e4" }, secondBest: { from: "d2", to: "d4", san: "d4" }, eval: 0.5 } as T;
    }
  }

  console.warn("Unhandled API mock:", method, path);
  return {} as T;
}

export { isPremiumOrAdmin };

