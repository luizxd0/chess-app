import { TIME_CONTROLS, SIDES, BOT_LEVELS, GAME_TYPES } from "../config/gameModes.js";

function formatTime(seconds) {
  if (seconds >= 60) return `${seconds / 60}`;
  return `${seconds}`;
}

const CATEGORIES = [
  { id: "bullet", label: "Bullet", icon: "⚡" },
  { id: "blitz", label: "Blitz", icon: "🔥" },
  { id: "rapid", label: "Rapid", icon: "⏱" },
  { id: "classic", label: "Classic", icon: "♟" },
];

export function createLeftSidebar(userInfo, callbacks) {
  const sidebar = document.createElement("aside");
  sidebar.className = "left-sidebar";

  sidebar.innerHTML = `
    <div class="nav-profile">
      <div class="nav-avatar">${userInfo.username.charAt(0).toUpperCase()}</div>
      <div class="nav-user-info">
        <div class="nav-username">${userInfo.username}</div>
        <div class="nav-rating">${userInfo.elo}</div>
      </div>
    </div>
    <div class="nav-divider"></div>
    <div class="nav-item active">
      <span class="nav-icon">♟</span>
      <span class="nav-label">Play</span>
    </div>
    <div class="nav-item">
      <span class="nav-icon">📊</span>
      <span class="nav-label">Stats</span>
    </div>
    <div class="nav-item">
      <span class="nav-icon">👥</span>
      <span class="nav-label">Friends</span>
    </div>
    <div class="nav-spacer"></div>
    <div class="nav-item nav-logout" id="nav-logout">
      <span class="nav-icon">🚪</span>
      <span class="nav-label">Sign Out</span>
    </div>
  `;

  const logoutBtn = sidebar.querySelector("#nav-logout");
  if (logoutBtn && callbacks && callbacks.onLogout) {
    logoutBtn.addEventListener("click", callbacks.onLogout);
  }

  return sidebar;
}

function createCenterWelcome(userInfo) {
  const center = document.createElement("main");
  center.className = "main-content";

  center.innerHTML = `
    <div class="center-welcome">
      <div class="welcome-icon">♟</div>
      <h2 class="welcome-title">Welcome back, ${userInfo.username}</h2>
      <p class="welcome-sub">Select a game mode on the right to start playing</p>
    </div>
  `;

  return center;
}

export function createLobby(config, userInfo, callbacks) {
  const layout = document.createElement("div");
  layout.className = "app-layout";

  const left = createLeftSidebar(userInfo, callbacks);

  const center = createCenterWelcome(userInfo);

  const right = document.createElement("aside");
  right.className = "right-sidebar";

  let activeGameType = config.gameType || "casual_bot";

  let activeCat = "blitz";
  if (config.timeControlId) {
    const tc = TIME_CONTROLS.find(t => t.id === config.timeControlId);
    if (tc) activeCat = tc.category;
  }
  let activeSub = config.timeControlId || "blitz5";

  function renderRight() {
    const byCategory = {};
    CATEGORIES.forEach(c => byCategory[c.id] = []);
    TIME_CONTROLS.forEach(tc => {
      if (byCategory[tc.category]) byCategory[tc.category].push(tc);
    });

    const currentTcs = byCategory[activeCat] || [];
    if (!currentTcs.find(t => t.id === activeSub) && currentTcs.length > 0) {
      activeSub = currentTcs[0].id;
    }

    const isOnline = activeGameType === "online";
    const isCasualBot = activeGameType === "casual_bot";
    const isRankedBot = activeGameType === "ranked_bot";
    const isBotGame = isCasualBot || isRankedBot;
    const showSides = isCasualBot;
    const minBotElo = Math.max(500, userInfo.elo - 25);

    right.innerHTML = `
      <h2 class="right-title">Play</h2>

      <div class="game-type-list">
        ${GAME_TYPES.map(gt => `
          <button class="game-type-btn ${gt.id === activeGameType ? "active" : ""}" data-gametype="${gt.id}">
            <span class="game-type-icon">${gt.icon}</span>
            <div class="game-type-info">
              <span class="game-type-label">${gt.label}</span>
              <span class="game-type-desc">${gt.desc}</span>
            </div>
          </button>
        `).join("")}
      </div>

      <div class="right-section">
        <label class="right-label">Time Control</label>
        <div class="cat-tabs" id="cat-tabs"></div>
        <div class="sub-options" id="sub-options"></div>
      </div>

      <div class="right-section" id="side-section" style="display:${showSides ? "" : "none"}">
        <label class="right-label">Play as</label>
        <div class="right-option-group" id="side-group"></div>
      </div>

      <div class="right-section" id="bot-section" style="display:${isBotGame ? "" : "none"}">
        <label class="right-label" id="bot-label">${isRankedBot ? "Bot Rating" : "Bot Level"}</label>
        <div class="right-option-group" id="bot-level-group" style="display:${isCasualBot ? "" : "none"}"></div>
        <div id="ranked-bot-info" style="display:${isRankedBot ? "" : "none"};background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;text-align:center;">
          <div style="font-size:12px;color:#94a3b8;">
            Bot rated <strong style="color:#e2e8f0">${minBotElo}-${userInfo.elo + 25}</strong>
          </div>
          <div style="font-size:11px;color:#64748b;margin-top:2px;">Rating changes on result</div>
        </div>
      </div>

      <div id="online-info" style="display:${isOnline ? "" : "none"};background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;text-align:center;">
        <div style="font-size:12px;color:#94a3b8;">
          Side and rating are random
        </div>
      </div>

      <button class="play-btn" id="play-btn">${isOnline ? "Find Match" : "Play"}</button>
    `;

    const tabs = right.querySelector("#cat-tabs");
    CATEGORIES.forEach(cat => {
      const tcs = byCategory[cat.id] || [];
      if (tcs.length === 0) return;
      const tab = document.createElement("button");
      tab.className = `cat-tab ${cat.id === activeCat ? "active" : ""}`;
      tab.innerHTML = `<span class="cat-icon">${cat.icon}</span> ${cat.label}`;
      tab.addEventListener("click", () => {
        activeCat = cat.id;
        const newTcs = byCategory[cat.id] || [];
        if (newTcs.length > 0 && !newTcs.find(t => t.id === activeSub)) {
          activeSub = newTcs[0].id;
        }
        config.timeControlId = activeSub;
        renderRight();
      });
      tabs.appendChild(tab);
    });

    const subContainer = right.querySelector("#sub-options");
    (byCategory[activeCat] || []).forEach(tc => {
      const btn = document.createElement("button");
      btn.className = `sub-btn ${tc.id === activeSub ? "active" : ""}`;
      const min = tc.initial / 60;
      const inc = tc.increment;
      const label = min >= 1 ? `${min}` : `${tc.initial}`;
      btn.innerHTML = `
        <span class="sub-time">${label}</span>
        <span class="sub-unit">${min >= 1 ? "min" : "sec"}${inc > 0 ? ` +${inc}s` : ""}</span>
      `;
      btn.addEventListener("click", () => {
        activeSub = tc.id;
        config.timeControlId = tc.id;
        subContainer.querySelectorAll(".sub-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
      subContainer.appendChild(btn);
    });

    if (showSides) {
      const sideGroup = right.querySelector("#side-group");
      SIDES.forEach(s => {
        const btn = document.createElement("button");
        btn.className = `right-btn ${s.id === config.side ? "active" : ""}`;
        btn.textContent = s.label;
        btn.addEventListener("click", () => {
          config.side = s.id;
          sideGroup.querySelectorAll(".right-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
        sideGroup.appendChild(btn);
      });
    }

    right.querySelectorAll(".game-type-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        activeGameType = btn.dataset.gametype;
        config.gameType = activeGameType;
        right.querySelectorAll(".game-type-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderRight();
      });
    });

    if (isCasualBot) {
      const levelGroup = right.querySelector("#bot-level-group");
      BOT_LEVELS.forEach(lvl => {
        const btn = document.createElement("button");
        btn.className = `right-btn ${lvl.id === config.engine.level ? "active" : ""}`;
        btn.textContent = lvl.label;
        btn.addEventListener("click", () => {
          config.engine.level = lvl.id;
          levelGroup.querySelectorAll(".right-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
        levelGroup.appendChild(btn);
      });
    }

    right.querySelector("#play-btn").addEventListener("click", () => {
      if (callbacks.onPlay) {
        config.gameType = activeGameType;
        config.timeControlId = activeSub;
        callbacks.onPlay(config);
      }
    });
  }

  renderRight();

  layout.appendChild(left);
  layout.appendChild(center);
  layout.appendChild(right);
  return layout;
}

export function createQueueOverlay(callbacks) {
  const overlay = document.createElement("div");
  overlay.className = "queue-overlay";

  const modal = document.createElement("div");
  modal.className = "queue-modal";

  modal.innerHTML = `
    <div class="queue-spinner"></div>
    <h2 class="queue-title">Finding opponent</h2>
    <p class="queue-info">Searching for a match...</p>
    <p class="queue-range" id="queue-range">ELO range: ±10</p>
    <p class="queue-time" id="queue-time">0s</p>
    <button class="play-btn" id="queue-cancel" style="background:rgba(255,255,255,0.08);font-size:14px;max-width:200px;margin:16px auto 0">Cancel</button>
  `;

  modal.querySelector("#queue-cancel").addEventListener("click", () => {
    if (callbacks.onCancel) callbacks.onCancel();
  });

  overlay.appendChild(modal);

  const startTime = Date.now();
  const rangeEl = modal.querySelector("#queue-range");
  const timeEl = modal.querySelector("#queue-time");

  function update() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const range = Math.min(10 + Math.floor(elapsed / 10) * 10, 500);
    rangeEl.textContent = `ELO range: \u00B1${range}`;
    timeEl.textContent = `${elapsed}s`;
  }

  const interval = setInterval(update, 1000);

  overlay._cleanup = () => clearInterval(interval);
  overlay._cancel = () => {
    clearInterval(interval);
    overlay.remove();
  };

  return overlay;
}
