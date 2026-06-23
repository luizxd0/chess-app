import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./firebase/Config.js";
import { createBoard } from "./components/Board.js";
import { createLobby, createLeftSidebar, createQueueOverlay } from "./components/Lobby.js";
import { initialPieces } from "./data/initialPieces.js";
import { getPlayerElo, setPlayerElo, calculateNewElo, updatePlayerStats } from "./game/elo.js";
import { StockfishEngine } from "./game/engine/StockfishEngine.js";
import { WHITE, BLACK } from "./game/chess.js";
import { TIME_CONTROLS, BOT_LEVELS } from "./config/gameModes.js";
import { isLoggedIn, getCurrentUser, clearSession, logout, login, register } from "./auth/Auth.js";
import { createMatchmaking, getGameData, deleteGame } from "./firebase/Matchmaking.js";
import { createWebRTC } from "./firebase/WebRTC.js";

const app = initializeApp(firebaseConfig);
const firestore = getFirestore();

const el = document.getElementById("app");

let currentBoard = null;
let engine = null;
let engineInitAttempted = false;
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

async function initEngine() {
  if (engineInitAttempted) return engine;
  engineInitAttempted = true;
  engine = new StockfishEngine();
  try {
    await engine.init();
  } catch (e) {
    console.warn("Stockfish init failed:", e);
    engine.available = false;
  }
  return engine;
}

function getGameTypeLabel() {
  const labels = { casual_bot: "Casual Bot", ranked_bot: "Ranked Bot", online: "Online" };
  return labels[config.gameType] || "Casual Bot";
}

function getSideChoice() {
  if (config.side === "white") return WHITE;
  if (config.side === "black") return BLACK;
  return Math.random() < 0.5 ? WHITE : BLACK;
}

function rowColToUci(row, col) {
  return String.fromCharCode(97 + col) + (8 - row);
}

function cleanupGame() {
  if (currentRtc) { currentRtc.destroy(); currentRtc = null; }
  if (currentMatchmaking) { currentMatchmaking.leaveQueue(); currentMatchmaking = null; }
  if (currentQueueOverlay) { currentQueueOverlay._cancel(); currentQueueOverlay = null; }
  currentBoard = null;
}

// ========== Auth ==========

function showAuth() {
  cleanupGame();
  el.innerHTML = "";

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
      const isRegister = mode === "register";
      const emailEl = overlay.querySelector("#auth-email");
      const usernameEl = overlay.querySelector("#auth-username");
      const email = (isRegister ? usernameEl : emailEl).value.trim();
      const username = (isRegister ? emailEl : usernameEl).value?.trim() || "";
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
        showLobby();
      } else {
        errorEl.textContent = result.error;
      }
    });
  }

  render();
  el.appendChild(overlay);
}

// ========== Lobby ==========

function showLobby() {
  cleanupGame();
  el.innerHTML = "";

  const user = getCurrentUser();
  const userInfo = user
    ? { username: user.username, elo: user.elo }
    : { username: "Guest", elo: 500 };

  const layout = createLobby(config, userInfo, {
    onPlay: startGame,
    onLogout: async () => {
      await logout();
      showAuth();
    },
  });

  el.appendChild(layout);
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
  config.isOnline = true;
  config.rated = true;
  config.opponentName = "";
  config.opponentElo = 500;

  currentMatchmaking = createMatchmaking(firestore, user);

  el.innerHTML = "";
  el.className = "app";

  const layout = document.createElement("div");
  layout.className = "app-layout";

  const left = createLeftSidebar(
    { username: user.username, elo: user.elo },
    {
      onLogout: async () => {
        await logout();
        cleanupGame();
        showAuth();
      },
    }
  );
  layout.appendChild(left);

  const center = document.createElement("main");
  center.className = "main-content";
  layout.appendChild(center);
  el.appendChild(layout);

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
      showLobby();
    },
  });
  document.body.appendChild(currentQueueOverlay);

  let matched = false;

  currentMatchmaking.startQueueListener((gameId, mySide, isOfferer) => {
    if (matched) return;
    matched = true;
    console.log("onMatched called: gameId=", gameId, "mySide=", mySide, "isOfferer=", isOfferer);

    if (currentQueueOverlay) {
      currentQueueOverlay._cancel();
      currentQueueOverlay = null;
    }

    (function tryGetGame(attempt) {
      getGameData(firestore, gameId).then((gameData) => {
        if (!gameData) {
          console.warn("getGameData attempt", attempt, "returned null for gameId", gameId);
          if (attempt < 3) {
            setTimeout(() => tryGetGame(attempt + 1), 500);
            return;
          }
          console.error("Match found but game doc missing after 3 retries:", gameId);
          showLobby();
          return;
        }

        const players = gameData.players;
        const opponentSide = mySide === "white" ? "black" : "white";
        const opponent = players[opponentSide];
        if (!opponent) {
          console.error("Match: opponent data missing", players, mySide);
          showLobby();
          return;
        }
        config.playerSide = mySide === "white" ? WHITE : BLACK;
        config.side = mySide;
        config.opponentName = opponent.username;
        config.opponentElo = opponent.elo;
        config.engine.enabled = false;
        console.log("Starting game against", opponent);

        startGameWebRTC(gameId, mySide, isOfferer);
      }).catch((err) => {
        console.error("getGameData error:", err);
        if (attempt < 3) {
          setTimeout(() => tryGetGame(attempt + 1), 500);
        } else {
          showLobby();
        }
      });
    })(0);
  });

  currentMatchmaking.joinQueue();
}

function startGameWebRTC(gameId, mySide, isOfferer) {
  const user = getCurrentUser();
  el.innerHTML = "";
  el.className = "app";

  const layout = document.createElement("div");
  layout.className = "app-layout";
  layout.classList.add("in-game");

  const left = createLeftSidebar(
    { username: user.username, elo: user.elo },
    {
      onLogout: async () => {
        await logout();
        cleanupGame();
        showAuth();
      },
    }
  );
  layout.appendChild(left);

  const center = document.createElement("main");
  center.className = "main-content board-view";
  layout.appendChild(center);

  const right = document.createElement("aside");
  right.className = "right-sidebar";

  const opponentLabel = `${config.opponentName} (${config.opponentElo})`;
  const sideLabel = config.playerSide === WHITE ? "White" : "Black";

  right.innerHTML = `
    <div class="game-info-panel">
      <h3 class="game-info-title">Game</h3>
      <div class="game-info-row">
        <span class="game-info-label">Type</span>
        <span class="game-info-value">Online</span>
      </div>
      <div class="game-info-row">
        <span class="game-info-label">Opponent</span>
        <span class="game-info-value">${opponentLabel}</span>
      </div>
      <div class="game-info-row">
        <span class="game-info-label">You play</span>
        <span class="game-info-value">${sideLabel}</span>
      </div>
      <div class="game-info-row">
        <span class="game-info-label">Time</span>
        <span class="game-info-value">${config.timeControl.label}</span>
      </div>
      <div class="game-info-row">
        <span class="game-info-label">Rated</span>
        <span class="game-info-value">Yes</span>
      </div>
    </div>
    <div class="game-actions">
      <button class="play-btn" id="game-resign" style="background:rgba(239,68,68,0.8)">Resign</button>
      <button class="play-btn" id="game-back" style="background:rgba(255,255,255,0.08);font-size:14px">Main Menu</button>
    </div>
  `;

  layout.appendChild(right);
  el.appendChild(layout);

  const pieces = JSON.parse(JSON.stringify(initialPieces));
  currentRtc = createWebRTC(firestore, gameId, mySide, isOfferer);

  currentBoard = createBoard(center, pieces, config, engine, {
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
  });

  currentRtc.onMove = (msg) => {
    if (currentBoard && currentBoard.applyMove) {
      const fr = 8 - parseInt(msg.from[1], 10);
      const fc = msg.from.charCodeAt(0) - 97;
      const tr = 8 - parseInt(msg.to[1], 10);
      const tc = msg.to.charCodeAt(0) - 97;
      currentBoard.applyMove(fr, fc, tr, tc);
    }
  };

  currentRtc.onOpponentResigned = () => {
    if (currentBoard && currentBoard.opponentResigned) {
      currentBoard.opponentResigned();
    }
  };

  currentRtc.init();

  // Desktop resign
  right.querySelector("#game-resign").addEventListener("click", () => {
    if (currentBoard) {
      showResignConfirm(() => {
        currentBoard.resign(config.playerSide);
        if (currentRtc) currentRtc.sendResign();
      });
    }
  });

  right.querySelector("#game-back").addEventListener("click", () => {
    cleanupGame();
    showLobby();
  });

  // Mobile controls
  const mobileControls = document.createElement("div");
  mobileControls.className = "mobile-game-controls";
  mobileControls.innerHTML = `
    <button class="right-btn" id="mobile-resign" style="background:rgba(239,68,68,0.25);border-color:rgba(239,68,68,0.3);color:#fca5a5">Resign</button>
    <button class="right-btn" id="mobile-back" style="background:rgba(255,255,255,0.05)">Menu</button>
  `;
  mobileControls.querySelector("#mobile-resign").addEventListener("click", () => {
    if (currentBoard) {
      showResignConfirm(() => {
        currentBoard.resign(config.playerSide);
        if (currentRtc) currentRtc.sendResign();
      });
    }
  });
  mobileControls.querySelector("#mobile-back").addEventListener("click", () => {
    cleanupGame();
    showLobby();
  });
  center.appendChild(mobileControls);
}

// ========== Game Start ==========

function startGame() {
  if (config.gameType === "online") {
    startOnlineGame();
    return;
  }

  el.innerHTML = "";
  el.className = "app";

  if (!config.isOnline) {
    config.playerSide = getSideChoice();
  }

  const user = getCurrentUser();
  const userInfo = user
    ? { username: user.username, elo: user.elo }
    : { username: "Guest", elo: 500 };

  config.playerName = userInfo.username;
  config.playerElo = userInfo.elo;

  if (config.gameType === "ranked_bot") {
    config.rated = true;
    const offset = Math.floor(Math.random() * 51) - 25;
    config.engine.elo = Math.max(500, userInfo.elo + offset);
    config.engine.depth = 10;
    config.engine.randomMoveChance = 0;
  } else {
    const level = getBotLevel(config.engine.level);
    if (level) {
      config.engine.elo = level.elo;
      config.engine.depth = level.depth;
      config.engine.randomMoveChance = level.randomMoveChance;
    }
  }

  const layout = document.createElement("div");
  layout.className = "app-layout";
  layout.classList.add("in-game");

  const left = createLeftSidebar(userInfo, {
    onLogout: async () => {
      await logout();
      cleanupGame();
      showAuth();
    },
  });
  layout.appendChild(left);

  const center = document.createElement("main");
  center.className = "main-content board-view";
  layout.appendChild(center);

  const right = document.createElement("aside");
  right.className = "right-sidebar";

  let opponentLabel;
  if (config.engine.enabled) {
    opponentLabel = `Bot (${config.engine.elo})`;
  } else {
    opponentLabel = "Player";
  }
  const sideLabel = config.playerSide === WHITE ? "White" : "Black";

  right.innerHTML = `
    <div class="game-info-panel">
      <h3 class="game-info-title">Game</h3>
      <div class="game-info-row">
        <span class="game-info-label">Type</span>
        <span class="game-info-value">${getGameTypeLabel()}</span>
      </div>
      <div class="game-info-row">
        <span class="game-info-label">Opponent</span>
        <span class="game-info-value">${opponentLabel}</span>
      </div>
      <div class="game-info-row">
        <span class="game-info-label">You play</span>
        <span class="game-info-value">${sideLabel}</span>
      </div>
      <div class="game-info-row">
        <span class="game-info-label">Time</span>
        <span class="game-info-value">${config.timeControl.label}</span>
      </div>
      ${config.rated ? '<div class="game-info-row"><span class="game-info-label">Rated</span><span class="game-info-value">Yes</span></div>' : '<div class="game-info-row"><span class="game-info-label">Rated</span><span class="game-info-value" style="color:#64748b">No</span></div>'}
    </div>
    <div class="game-actions">
      <button class="play-btn" id="game-resign" style="background:rgba(239,68,68,0.8)">Resign</button>
      <button class="play-btn" id="game-back" style="background:rgba(255,255,255,0.08);font-size:14px">Main Menu</button>
    </div>
  `;

  right.querySelector("#game-resign").addEventListener("click", () => {
    if (currentBoard) {
      showResignConfirm(() => {
        currentBoard.resign(config.playerSide);
      });
    }
  });

  right.querySelector("#game-back").addEventListener("click", () => {
    cleanupGame();
    showLobby();
  });

  layout.appendChild(right);
  el.appendChild(layout);

  const pieces = JSON.parse(JSON.stringify(initialPieces));
  currentBoard = createBoard(center, pieces, config, engine, {
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
  });

  // Mobile controls
  const mobileControls = document.createElement("div");
  mobileControls.className = "mobile-game-controls";
  mobileControls.innerHTML = `
    <button class="right-btn" id="mobile-resign" style="background:rgba(239,68,68,0.25);border-color:rgba(239,68,68,0.3);color:#fca5a5">Resign</button>
    <button class="right-btn" id="mobile-back" style="background:rgba(255,255,255,0.05)">Menu</button>
  `;
  mobileControls.querySelector("#mobile-resign").addEventListener("click", () => {
    if (currentBoard) {
      showResignConfirm(() => {
        currentBoard.resign(config.playerSide);
      });
    }
  });
  mobileControls.querySelector("#mobile-back").addEventListener("click", () => {
    cleanupGame();
    showLobby();
  });
  center.appendChild(mobileControls);
}

// ========== Game Over Modal ==========

function showGameOverModal(result, oldElo, newElo, rated) {
  const existing = document.querySelector(".game-over-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "game-over-overlay";

  const modal = document.createElement("div");
  modal.className = "game-over-modal";

  let emoji, titleClass, subtitle, eloHtml;
  const isWin = result.winner === result.playerSide;
  const isLoss = result.winner !== null && result.winner !== result.playerSide;
  const isDraw = result.result === "stalemate" || result.winner === null;

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
    ${eloHtml ? `<p style="color:#94a3b8;font-size:15px;margin:4px 0 16px">${eloHtml}</p>` : ""}
    ${casualNote}
    <button class="play-again" id="back-to-menu">Main Menu</button>
  `;

  modal.querySelector("#back-to-menu").addEventListener("click", () => {
    overlay.remove();
    showLobby();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function showResignConfirm(onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "game-over-overlay";
  const modal = document.createElement("div");
  modal.className = "game-over-modal";
  modal.innerHTML = `
    <div style="font-size:36px;margin-bottom:8px">\u{1F3F3}</div>
    <p style="font-size:18px;font-weight:700;margin:0 0 4px;color:#e2e8f0">Resign?</p>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px">This will count as a loss.</p>
    <div style="display:flex;gap:8px;justify-content:center">
      <button class="play-again" id="resign-yes" style="background:#ef4444">Yes, Resign</button>
      <button class="play-again" id="resign-no" style="background:rgba(255,255,255,0.08);color:#94a3b8">Cancel</button>
    </div>
  `;
  modal.querySelector("#resign-yes").addEventListener("click", () => { overlay.remove(); onConfirm(); });
  modal.querySelector("#resign-no").addEventListener("click", () => overlay.remove());
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ========== Init ==========

el.className = "app";

if (isLoggedIn()) {
  showLobby();
} else {
  showAuth();
}

initEngine();
