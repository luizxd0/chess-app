import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./firebase/Config.js";
import { createBoard } from "./components/Board.js";
import { createPiece } from "./components/Piece.js";
import { createHomeScreen, createSettingsScreen, createQueueOverlay } from "./components/Lobby.js";
import { initialPieces } from "./data/initialPieces.js";
import { getPlayerElo, setPlayerElo, calculateNewElo, updatePlayerStats } from "./game/elo.js";
import { StockfishEngine } from "./game/engine/StockfishEngine.js";
import { WHITE, BLACK } from "./game/chess.js";
import { BOARD_SIZE, FILES, RANKS } from "./config/boardConfig.js";
import { TIME_CONTROLS, BOT_LEVELS } from "./config/gameModes.js";
import { isLoggedIn, getCurrentUser, logout, login, register, initSession, checkAndRecoverAuth } from "./auth/Auth.js";
import { createMatchmaking, getGameData, deleteGame } from "./firebase/Matchmaking.js";
import { createWebRTC } from "./firebase/WebRTC.js";

const app = initializeApp(firebaseConfig);
const firestore = getFirestore();

const el = document.getElementById("app");

let currentBoard = null;
let engine = null;
let engineInitPromise = null;
let currentRtc = null;
let currentMatchmaking = null;
let currentQueueOverlay = null;

const config = {
  gameType: "casual_bot",
  timeControlId: "blitz5",
  side: "random",
  engine: {
    enabled: true,
    level: "intermediate",
    elo: 1000,
    depth: 8,
    randomMoveChance: 0,
  },
  playerSide: WHITE,
  timeControl: TIME_CONTROLS.find((t) => t.id === "blitz5"),
  rated: false,
  isOnline: false,
  opponentName: "",
  opponentElo: 500,
  playerName: "",
  playerElo: 500,
};

function getBotLevel(levelId) {
  return BOT_LEVELS.find((l) => l.id === levelId);
}

function syncTimeControl() {
  config.timeControl = TIME_CONTROLS.find((t) => t.id === config.timeControlId)
    || TIME_CONTROLS.find((t) => t.id === "blitz5")
    || TIME_CONTROLS[0];
}

async function initEngine() {
  if (engineInitPromise) return engineInitPromise;
  engine = new StockfishEngine();
  engineInitPromise = (async () => {
    try {
      await engine.init();
    } catch (e) {
      console.warn("Stockfish init failed:", e);
      engine.available = false;
    }
    return engine;
  })();
  return engineInitPromise;
}

function getSideChoice() {
  if (config.side === "white") return WHITE;
  if (config.side === "black") return BLACK;
  return Math.random() < 0.5 ? WHITE : BLACK;
}

function rowColToUci(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

function cloneAnalysisData(result) {
  if (!result || !Array.isArray(result.snapshots)) return null;
  return {
    playerSide: result.playerSide,
    result: result.result,
    winner: result.winner,
    moveHistory: Array.isArray(result.moveHistory) ? [...result.moveHistory] : [],
    snapshots: result.snapshots.map((snapshot) => ({
      pieces: { ...snapshot.pieces },
      castlingRights: { ...snapshot.castlingRights },
      enPassantTarget: snapshot.enPassantTarget ? { ...snapshot.enPassantTarget } : null,
      turn: snapshot.turn,
      capturedByWhite: [...(snapshot.capturedByWhite || [])],
      capturedByBlack: [...(snapshot.capturedByBlack || [])],
      lastMove: snapshot.lastMove ? { from: { ...snapshot.lastMove.from }, to: { ...snapshot.lastMove.to } } : null,
    })),
  };
}

function cleanupGame() {
  if (currentBoard && typeof currentBoard.cleanup === "function") {
    currentBoard.cleanup();
  }
  if (currentRtc) { currentRtc.destroy(); currentRtc = null; }
  if (currentMatchmaking) { currentMatchmaking.leaveQueue(); currentMatchmaking = null; }
  if (currentQueueOverlay) { currentQueueOverlay._cancel(); currentQueueOverlay = null; }
  currentBoard = null;
}

// ========== Auth ==========

function showAuth(initialError) {
  cleanupGame();
  el.innerHTML = "";
  el.className = "app";

  const overlay = document.createElement("div");
  overlay.className = "auth-overlay";

  let mode = "login";

  function render() {
    const isLogin = mode === "login";
    overlay.innerHTML = `
      <div class="auth-modal">
        <h1 class="auth-title" style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent">♟ CHESS</h1>
        <p class="auth-subtitle">${isLogin ? "Welcome back" : "Create an account"}</p>
        <div class="auth-tabs">
          <button class="auth-tab ${isLogin ? "active" : ""}" id="tab-login">Sign In</button>
          <button class="auth-tab ${isLogin ? "" : "active"}" id="tab-register">Register</button>
        </div>
        <form class="auth-form" id="auth-form">
          <div class="auth-field">
            <label for="auth-email">${isLogin ? "Email" : "Username"}</label>
            <input id="auth-email" type="${isLogin ? "email" : "text"}" placeholder="${isLogin ? "your@email.com" : "Your username"}" autocomplete="${isLogin ? "email" : "off"}" />
          </div>
          <div class="auth-field" id="reg-email-field" style="display:${isLogin ? "none" : "block"}">
            <label for="auth-username">Email</label>
            <input id="auth-username" type="text" placeholder="your@email.com" autocomplete="email" />
          </div>
          <div class="auth-field">
            <label for="auth-password">Password</label>
            <input id="auth-password" type="password" placeholder="Enter password" autocomplete="${isLogin ? "current-password" : "new-password"}" />
          </div>
          <p class="auth-error" id="auth-error"></p>
          <button class="auth-submit" id="auth-submit" type="submit">${isLogin ? "Sign In" : "Create Account"}</button>
        </form>
      </div>
    `;

    overlay.querySelector("#tab-login").addEventListener("click", () => { mode = "login"; render(); });
    overlay.querySelector("#tab-register").addEventListener("click", () => { mode = "register"; render(); });

    overlay.querySelector("#auth-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const emailEl = overlay.querySelector("#auth-email");
      const usernameEl = overlay.querySelector("#auth-username");
      const email = (mode === "register" ? usernameEl : emailEl).value.trim();
      const username = (mode === "register" ? emailEl : usernameEl).value?.trim() || "";
      const password = overlay.querySelector("#auth-password").value;
      const errorEl = overlay.querySelector("#auth-error");
      const btn = overlay.querySelector("#auth-submit");
      btn.disabled = true;
      btn.textContent = "Connecting...";

      let result;
      if (mode === "login") {
        result = await login(email, password);
      } else {
        result = await register(username, email, password);
      }

      btn.disabled = false;
      btn.textContent = mode === "login" ? "Sign In" : "Create Account";

      if (result.success) {
        showHome();
      } else {
        errorEl.textContent = result.error;
      }
    });
  }

  render();
  el.appendChild(overlay);

  if (initialError) {
    const errEl = overlay.querySelector("#auth-error");
    if (errEl) errEl.textContent = initialError;
  }
}

// ========== Home Screen ==========

function showHome() {
  cleanupGame();
  el.innerHTML = "";
  el.className = "app";

  const user = getCurrentUser();
  const userInfo = user
    ? { username: user.username, elo: user.elo }
    : { username: "Guest", elo: 500 };

  const home = createHomeScreen(userInfo, {
    onLogout: async () => {
      await logout();
      showAuth();
    },
    onSelectMode: (gameType) => {
      config.gameType = gameType;
      if (gameType === "online") {
        startOnlineGame();
      } else {
        showSettings(gameType);
      }
    },
  });

  const inner = document.createElement("div");
  inner.className = "app-inner";
  inner.appendChild(home);
  el.appendChild(inner);
}

// ========== Settings Screen ==========

function showSettings(gameType) {
  el.innerHTML = "";
  el.className = "app";

  const user = getCurrentUser();
  const userInfo = user
    ? { username: user.username, elo: user.elo }
    : { username: "Guest", elo: 500 };

  const settings = createSettingsScreen(config, gameType, userInfo, {
    onBack: () => showHome(),
    onPlay: () => startGame(),
  });

  const inner = document.createElement("div");
  inner.className = "app-inner";
  inner.appendChild(settings);
  el.appendChild(inner);
}

// ========== Queue / Online Game ==========

function startOnlineGame() {
  const user = getCurrentUser();
  if (!user) {
    showAuth();
    return;
  }

  config.playerName = user.username;
  config.playerElo = user.elo;
  syncTimeControl();
  config.isOnline = true;
  config.rated = true;
  config.opponentName = "";
  config.opponentElo = 500;

  currentMatchmaking = createMatchmaking(firestore, user);

  el.innerHTML = "";
  el.className = "app";

  const inner = document.createElement("div");
  inner.className = "app-inner";
  el.appendChild(inner);

  currentQueueOverlay = createQueueOverlay({
    onCancel: async () => {
      if (currentQueueOverlay) {
        currentQueueOverlay._cancel();
        currentQueueOverlay = null;
      }
      if (currentMatchmaking) {
        await currentMatchmaking.leaveQueue();
        currentMatchmaking = null;
      }
      showHome();
    },
  });
  document.body.appendChild(currentQueueOverlay);

  let matched = false;

  currentMatchmaking.startQueueListener((gameId, mySide, isOfferer) => {
    if (matched) return;
    matched = true;
    if (currentQueueOverlay) {
      currentQueueOverlay._cancel();
      currentQueueOverlay = null;
    }

    (function tryGetGame(attempt) {
      getGameData(firestore, gameId).then((gameData) => {
        if (!gameData) {
          if (attempt < 3) {
            setTimeout(() => tryGetGame(attempt + 1), 500);
            return;
          }
          console.error("Match found but game doc missing after 3 retries:", gameId);
          showHome();
          return;
        }

        const players = gameData.players;
        const opponentSide = mySide === "white" ? "black" : "white";
        const opponent = players[opponentSide];
        if (!opponent) {
          console.error("Match: opponent data missing", players, mySide);
          showHome();
          return;
        }
        config.playerSide = mySide === "white" ? WHITE : BLACK;
        config.side = mySide;
        config.opponentName = opponent.username;
        config.opponentElo = opponent.elo;
        config.engine.enabled = false;

        startGameWebRTC(gameId, mySide, isOfferer);
      }).catch((err) => {
        console.error("getGameData error:", err);
        if (attempt < 3) {
          setTimeout(() => tryGetGame(attempt + 1), 500);
        } else {
          showHome();
        }
      });
    })(0);
  });

  currentMatchmaking.joinQueue();
}

// ========== Build Game Screen (shared by bot + WebRTC) ==========

function buildGameScreen() {
  el.innerHTML = "";
  el.className = "app";

  const gameScreen = document.createElement("div");
  gameScreen.className = "game-screen";

  const actionsBar = document.createElement("div");
  actionsBar.className = "game-actions-bar";

  if (config.gameType === "coach_bot") {
    actionsBar.innerHTML = `
      <button class="action-btn resign-btn" id="game-resign">🏳 Resign</button>
      <div class="arrow-toggles">
        <button class="toggle-btn active" id="toggle-player-arrows" title="Show your best moves">Your Arrows</button>
        <button class="toggle-btn" id="toggle-enemy-arrows" title="Show opponent's best moves">Enemy Arrows</button>
      </div>
      <div class="coach-depth" id="coach-depth" title="Current search depth for displayed arrow">Depth: --</div>
      <button class="action-btn menu-btn" id="game-back">← Menu</button>
    `;
  } else {
    actionsBar.innerHTML = `
      <button class="action-btn resign-btn" id="game-resign">🏳 Resign</button>
      <button class="action-btn menu-btn" id="game-back">← Menu</button>
    `;
  }

  gameScreen.appendChild(actionsBar);

  const inner = document.createElement("div");
  inner.className = "app-inner";
  inner.appendChild(gameScreen);
  el.appendChild(inner);

  actionsBar.querySelector("#game-resign").addEventListener("click", () => {
    if (currentBoard) {
      showResignConfirm(() => {
        currentBoard.resign(config.playerSide);
        if (currentRtc) currentRtc.sendResign();
      });
    }
  });

  actionsBar.querySelector("#game-back").addEventListener("click", () => {
    cleanupGame();
    showHome();
  });

  if (config.gameType === "coach_bot") {
    const playerArrowsBtn = actionsBar.querySelector("#toggle-player-arrows");
    const enemyArrowsBtn = actionsBar.querySelector("#toggle-enemy-arrows");
    const depthBadge = actionsBar.querySelector("#coach-depth");

    gameScreen.updateCoachDepth = (info) => {
      if (!depthBadge) return;
      if (!info || info.depth === null || info.targetDepth === null) {
        depthBadge.textContent = "Depth: --";
        return;
      }
      const isPlayer = info.side === info.playerSide;
      const sideText = isPlayer ? "You" : "Enemy";
      depthBadge.textContent = `Depth: ${info.depth}/${info.targetDepth} (${sideText})`;
    };

    if (playerArrowsBtn) {
      playerArrowsBtn.addEventListener("click", () => {
        playerArrowsBtn.classList.toggle("active");
        if (currentBoard) {
          currentBoard.togglePlayerArrows(playerArrowsBtn.classList.contains("active"));
        }
      });
    }

    if (enemyArrowsBtn) {
      enemyArrowsBtn.addEventListener("click", () => {
        enemyArrowsBtn.classList.toggle("active");
        if (currentBoard) {
          currentBoard.toggleEnemyArrows(enemyArrowsBtn.classList.contains("active"));
        }
      });
    }
  }

  return gameScreen;
}

// ========== WebRTC Game ==========

function startGameWebRTC(gameId, mySide, isOfferer) {
  const user = getCurrentUser();
  const boardCard = buildGameScreen();

  const pieces = JSON.parse(JSON.stringify(initialPieces));
  currentRtc = createWebRTC(firestore, gameId, mySide, isOfferer);

  currentBoard = createBoard(boardCard, pieces, config, engine, {
    onPlayerMove: (fromRow, fromCol, toRow, toCol) => {
      const from = rowColToUci(fromRow, fromCol);
      const to = rowColToUci(toRow, toCol);
      if (currentRtc) currentRtc.sendMove(from, to);
    },
    onGameOver: (result) => {
      deleteGame(firestore, gameId);

      if (config.rated) {
        const playerElo = getPlayerElo();
        const opponentElo = config.opponentElo;
        let gameResult = 0.5;

        if (result.result === "stalemate") {
          gameResult = 0.5;
        } else if (result.winner === result.playerSide) {
          gameResult = 1;
        } else if (result.winner !== null) {
          gameResult = 0;
        }

        const newElo = calculateNewElo(playerElo, opponentElo, gameResult);
        setPlayerElo(newElo);
        updatePlayerStats(gameResult === 1, gameResult === 0.5);

        setTimeout(() => {
          cleanupGame();
          showGameOverModal(result, playerElo, newElo, true);
        }, 2000);
      } else {
        setTimeout(() => {
          cleanupGame();
          showGameOverModal(result, null, null, false);
        }, 2000);
      }
    },
    onSuggestionDepth: (info) => {
      if (boardCard.updateCoachDepth) boardCard.updateCoachDepth(info);
    },
  });

  currentRtc.onMove = (msg) => {
    if (!msg || typeof msg.from !== "string" || typeof msg.to !== "string") {
      console.warn("[WebRTC] Ignored malformed move payload", msg);
      return;
    }
    if (!/^[a-h][1-8]$/i.test(msg.from) || !/^[a-h][1-8]$/i.test(msg.to)) {
      console.warn("[WebRTC] Ignored invalid UCI square in move", msg);
      return;
    }

    if (currentBoard && currentBoard.applyMove) {
      const from = msg.from.toLowerCase();
      const to = msg.to.toLowerCase();
      const fr = 8 - parseInt(from[1], 10);
      const fc = from.charCodeAt(0) - 97;
      const tr = 8 - parseInt(to[1], 10);
      const tc = to.charCodeAt(0) - 97;
      const ok = currentBoard.applyMove(fr, fc, tr, tc);
      if (ok === false) {
        console.warn("[WebRTC] Move was ignored by board validation", msg);
      }
    }
  };

  currentRtc.onOpponentResigned = () => {
    if (currentBoard && currentBoard.opponentResigned) {
      currentBoard.opponentResigned();
    }
  };

  currentRtc.init();
}

// ========== Bot Game ==========

async function startGame() {
  if (config.gameType === "online") {
    startOnlineGame();
    return;
  }

  await initEngine();
  syncTimeControl();

  config.isOnline = false;
  config.side = "random";
  config.playerSide = getSideChoice();

  const user = getCurrentUser();
  const userInfo = user
    ? { username: user.username, elo: user.elo }
    : { username: "Guest", elo: 500 };

  config.playerName = userInfo.username;
  config.playerElo = userInfo.elo;
  config.engine.enabled = true;
  config.rated = false;

  if (config.gameType === "ranked_bot") {
    config.rated = true;
    const offset = Math.floor(Math.random() * 51) - 25;
    const botElo = Math.max(500, userInfo.elo + offset);
    config.engine.elo = botElo;

    if (botElo <= 600) {
      config.engine.depth = 2;
      config.engine.randomMoveChance = 0.45;
    } else if (botElo <= 800) {
      config.engine.depth = 4;
      config.engine.randomMoveChance = 0.3;
    } else if (botElo <= 1000) {
      config.engine.depth = 6;
      config.engine.randomMoveChance = 0.2;
    } else if (botElo <= 1300) {
      config.engine.depth = 8;
      config.engine.randomMoveChance = 0.1;
    } else if (botElo <= 1600) {
      config.engine.depth = 10;
      config.engine.randomMoveChance = 0.05;
    } else if (botElo <= 2000) {
      config.engine.depth = 12;
      config.engine.randomMoveChance = 0;
    } else if (botElo <= 2500) {
      config.engine.depth = 16;
      config.engine.randomMoveChance = 0;
    } else {
      config.engine.depth = 20;
      config.engine.randomMoveChance = 0;
    }
  } else {
    const level = getBotLevel(config.engine.level);
    if (level) {
      config.engine.elo = level.elo;
      config.engine.depth = level.depth;
      config.engine.randomMoveChance = level.randomMoveChance;
    }
  }

  const boardCard = buildGameScreen();

  const pieces = JSON.parse(JSON.stringify(initialPieces));
  currentBoard = createBoard(boardCard, pieces, config, engine, {
    onPlayerMove: () => {},
    onGameOver: (result) => {
      if (config.rated && !config.isOnline) {
        const playerElo = getPlayerElo();
        let opponentElo = config.engine.enabled ? config.engine.elo : playerElo;
        let gameResult = 0.5;

        if (result.result === "stalemate") {
          gameResult = 0.5;
        } else if (result.winner === result.playerSide) {
          gameResult = 1;
        } else if (result.winner !== null) {
          gameResult = 0;
        }

        const newElo = calculateNewElo(playerElo, opponentElo, gameResult);
        setPlayerElo(newElo);
        updatePlayerStats(gameResult === 1, gameResult === 0.5);

        setTimeout(() => {
          cleanupGame();
          showGameOverModal(result, playerElo, newElo, true);
        }, 2000);
      } else {
        setTimeout(() => {
          cleanupGame();
          showGameOverModal(result, null, null, false);
        }, 2000);
      }
    },
    onSuggestionDepth: (info) => {
      if (boardCard.updateCoachDepth) boardCard.updateCoachDepth(info);
    },
  });
}

// ========== Game Over Modal ==========

function showGameOverModal(result, oldElo, newElo, rated) {
  const existing = document.querySelector(".game-over-overlay");
  if (existing) existing.remove();
  const analysisData = cloneAnalysisData(result);

  const overlay = document.createElement("div");
  overlay.className = "game-over-overlay";

  const modal = document.createElement("div");
  modal.className = "game-over-modal";

  let emoji, titleClass, subtitle, eloHtml;
  const isWin = result.winner === result.playerSide;
  const isLoss = result.winner !== null && result.winner !== result.playerSide;

  if (isWin) {
    emoji = "\u{1F3C6}";
    titleClass = "white-wins";
    subtitle = "You Win!";
    eloHtml = rated
      ? `Rating: <span class="white-wins">${oldElo} \u2192 ${newElo} (+${newElo - oldElo})</span>`
      : "";
  } else if (isLoss) {
    emoji = "\u{1F61E}";
    titleClass = "black-wins";
    if (result.result === "time") subtitle = "You ran out of time!";
    else if (result.result === "resign") subtitle = "You resigned";
    else subtitle = "You Lost";
    eloHtml = rated
      ? `Rating: <span class="black-wins">${oldElo} \u2192 ${newElo} (${newElo - oldElo})</span>`
      : "";
  } else {
    emoji = "\u{1F91D}";
    titleClass = "draw";
    subtitle = "Draw \u2014 Stalemate";
    eloHtml = rated ? `Rating: ${oldElo} \u2192 ${newElo}` : "";
  }

  const casualNote = !rated
    ? '<p style="color:#64748b;font-size:13px;margin:4px 0 16px">Casual game \u2014 no rating change</p>'
    : "";

  modal.innerHTML = `
    <div class="game-over-emoji">${emoji}</div>
    <p class="game-over-text ${titleClass}">${subtitle}</p>
    ${eloHtml ? `<p class="game-over-rating">${eloHtml}</p>` : ""}
    ${casualNote}
    ${analysisData ? '<button class="play-again analyze-match" id="analyze-match">Analyse Match</button>' : ""}
    <button class="play-again" id="back-to-menu">Main Menu</button>
  `;

  const analyzeBtn = modal.querySelector("#analyze-match");
  if (analyzeBtn && analysisData) {
    analyzeBtn.addEventListener("click", () => {
      overlay.remove();
      showAnalysisScreen(analysisData);
    });
  }

  modal.querySelector("#back-to-menu").addEventListener("click", () => {
    overlay.remove();
    showHome();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function showAnalysisScreen(analysisData) {
  if (!analysisData || !analysisData.snapshots || analysisData.snapshots.length === 0) {
    showHome();
    return;
  }

  cleanupGame();
  el.innerHTML = "";
  el.className = "app";

  const playerSide = analysisData.playerSide || WHITE;
  let index = analysisData.snapshots.length - 1;

  const inner = document.createElement("div");
  inner.className = "app-inner";
  const screen = document.createElement("div");
  screen.className = "analysis-screen";
  screen.innerHTML = `
    <div class="analysis-header">
      <button class="settings-back" id="analysis-back">←</button>
      <div>
        <div class="analysis-title">Match Analysis</div>
        <div class="analysis-subtitle" id="analysis-subtitle"></div>
      </div>
    </div>
    <div class="analysis-content">
      <div class="analysis-board-wrap">
        <div class="chess-board analysis-board" id="analysis-board"></div>
      </div>
      <div class="analysis-controls" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <button class="analysis-btn" id="analysis-start">Start</button>
        <button class="analysis-btn" id="analysis-prev">Prev</button>
        <button class="analysis-btn" id="analysis-next">Next</button>
        <button class="analysis-btn" id="analysis-live">Latest</button>
      </div>
      <div class="analysis-panel">
        <div class="analysis-panel-title">Moves</div>
        <div class="analysis-moves" id="analysis-moves"></div>
      </div>
    </div>
  `;
  inner.appendChild(screen);
  el.appendChild(inner);

  const boardEl = screen.querySelector("#analysis-board");
  const subtitleEl = screen.querySelector("#analysis-subtitle");
  const movesEl = screen.querySelector("#analysis-moves");

  function sizeBoard() {
    const wrapRect = boardEl.parentElement.getBoundingClientRect();
    const maxHeight = Math.max(260, (window.innerHeight || 700) * 0.56);
    const px = Math.max(240, Math.min(wrapRect.width - 8, maxHeight, 560));
    boardEl.style.width = px + "px";
    boardEl.style.height = px + "px";
    boardEl.style.setProperty("--piece-size", (px / 8 * 0.82) + "px");
  }

  function renderBoard() {
    const snapshot = analysisData.snapshots[index];
    boardEl.innerHTML = "";
    const rows = [...Array(BOARD_SIZE).keys()];
    const cols = [...Array(BOARD_SIZE).keys()];
    const renderRows = playerSide === BLACK ? rows.reverse() : rows;
    const renderCols = playerSide === BLACK ? cols.reverse() : cols;

    for (const row of renderRows) {
      for (const col of renderCols) {
        const squareColor = (row + col) % 2 === 0 ? "light" : "dark";
        const cell = document.createElement("div");
        cell.className = `cell ${squareColor}`;
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (snapshot.lastMove) {
          if (snapshot.lastMove.from.row === row && snapshot.lastMove.from.col === col) {
            cell.classList.add("last-move-from");
          }
          if (snapshot.lastMove.to.row === row && snapshot.lastMove.to.col === col) {
            cell.classList.add("last-move-to");
          }
        }

        const pieceData = snapshot.pieces[`${row}-${col}`];
        if (pieceData) cell.appendChild(createPiece(pieceData));

        if (col === (playerSide === BLACK ? 7 : 0)) {
          const label = document.createElement("span");
          label.className = "coord rank-coord";
          label.textContent = RANKS[row];
          cell.appendChild(label);
        }
        if (row === (playerSide === BLACK ? 0 : BOARD_SIZE - 1)) {
          const label = document.createElement("span");
          label.className = "coord file-coord";
          label.textContent = FILES[col];
          cell.appendChild(label);
        }
        boardEl.appendChild(cell);
      }
    }

    subtitleEl.textContent = index === 0
      ? "Starting position"
      : `Move ${index}/${analysisData.snapshots.length - 1}: ${analysisData.moveHistory[index - 1] || ""}`;
    renderMoves();
  }

  function renderMoves() {
    movesEl.innerHTML = "";
    analysisData.moveHistory.forEach((move, moveIdx) => {
      const btn = document.createElement("button");
      btn.className = `analysis-move${moveIdx + 1 === index ? " active" : ""}`;
      btn.textContent = `${moveIdx + 1}. ${move}`;
      btn.addEventListener("click", () => {
        index = moveIdx + 1;
        renderBoard();
      });
      movesEl.appendChild(btn);
    });
  }

  function goTo(nextIndex) {
    index = Math.max(0, Math.min(nextIndex, analysisData.snapshots.length - 1));
    renderBoard();
  }

  const onAnalysisResize = () => {
    sizeBoard();
    renderBoard();
  };
  const leaveAnalysis = () => {
    window.removeEventListener("resize", onAnalysisResize);
    showHome();
  };

  screen.querySelector("#analysis-back").addEventListener("click", leaveAnalysis);
  screen.querySelector("#analysis-start").addEventListener("click", () => goTo(0));
  screen.querySelector("#analysis-prev").addEventListener("click", () => goTo(index - 1));
  screen.querySelector("#analysis-next").addEventListener("click", () => goTo(index + 1));
  screen.querySelector("#analysis-live").addEventListener("click", () => goTo(analysisData.snapshots.length - 1));
  window.addEventListener("resize", onAnalysisResize);

  sizeBoard();
  renderBoard();
}

function showResignConfirm(onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "game-over-overlay";
  const modal = document.createElement("div");
  modal.className = "game-over-modal resign-modal";
  modal.innerHTML = `
    <div style="font-size:36px;margin-bottom:8px">\u{1F3F3}</div>
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#e2e8f0">Resign?</p>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 4px">This will count as a loss.</p>
    <div class="resign-actions">
      <button class="play-again resign-yes" id="resign-yes">Yes, Resign</button>
      <button class="play-again resign-no" id="resign-no">Cancel</button>
    </div>
  `;
  modal.querySelector("#resign-yes").addEventListener("click", () => { overlay.remove(); onConfirm(); });
  modal.querySelector("#resign-no").addEventListener("click", () => overlay.remove());
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ========== Init ==========

el.className = "app";

(async () => {
  // Check Firebase auth state and recover from stale / corrupted tokens
  // before rendering any screen.  This prevents the "login page won't load
  // after long background" issue without requiring the user to clear all
  // browser data.
  let authResult;
  try {
    authResult = await checkAndRecoverAuth();
  } catch (e) {
    console.error("[main] checkAndRecoverAuth threw unexpectedly:", e);
    authResult = { ok: false, recovered: true };
  }

  if (!authResult.ok && authResult.recovered) {
    // Storage was cleared; go straight to login.
    showAuth();
    initEngine();
    return;
  }

  if (isLoggedIn()) {
    const result = await initSession();
    if (result && !result.ok) {
      showAuth(result.error);
    } else {
      showHome();
    }
  } else {
    showAuth();
  }

  initEngine();
})();
