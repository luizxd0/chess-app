import { getSession, updateUserStats } from "../auth/Auth.js";

const STORAGE_KEY = "chess_player_elo";

export function getPlayerElo() {
  const session = getSession();
  if (session) return session.elo;
  return parseInt(localStorage.getItem(STORAGE_KEY) || "500", 10);
}

export function setPlayerElo(elo) {
  const rounded = Math.round(elo);
  const session = getSession();
  if (session) {
    session.elo = rounded;
    localStorage.setItem("chess_session", JSON.stringify(session));
    updateUserStats(rounded, session.stats);
    return;
  }
  localStorage.setItem(STORAGE_KEY, rounded.toString());
}

export function resetPlayerElo() {
  const session = getSession();
  if (session) {
    setPlayerElo(500);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function calculateNewElo(playerElo, opponentElo, result) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(playerElo + K * (result - expected));
}

export function updatePlayerStats(won, drew) {
  const session = getSession();
  if (!session) return;
  const stats = { ...session.stats };
  if (drew) stats.draws = (stats.draws || 0) + 1;
  else if (won) stats.wins = (stats.wins || 0) + 1;
  else stats.losses = (stats.losses || 0) + 1;
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  session.stats = stats;
  localStorage.setItem("chess_session", JSON.stringify(session));
  updateUserStats(session.elo, stats);
}
