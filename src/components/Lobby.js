import { TIME_CONTROLS, SIDES, BOT_LEVELS, GAME_TYPES } from "../config/gameModes.js";

const CATEGORIES = [
  { id: "bullet", label: "Bullet", icon: "⚡" },
  { id: "blitz", label: "Blitz", icon: "🔥" },
  { id: "rapid", label: "Rapid", icon: "⏱" },
  { id: "classic", label: "Classic", icon: "♟" },
];

const MODE_META = {
  online:     { icon: "👥", iconClass: "online",  desc: "Match with a player at your level" },
  casual_bot: { icon: "🤖", iconClass: "bot",     desc: "Pick a difficulty — no rating change" },
  ranked_bot: { icon: "🏆", iconClass: "ranked",  desc: "Bot matched to your rating" },
  coach_bot:  { icon: "🧠", iconClass: "coach",   desc: "Bot shows best moves to help you learn" },
};

export function createHomeScreen(config, userInfo, callbacks) {
  const screen = document.createElement("div");
  screen.className = "home-screen";

  screen.innerHTML = `
    <div class="home-header">
      <div class="home-avatar">${userInfo.username.charAt(0).toUpperCase()}</div>
      <div class="home-user-info">
        <div class="home-username">${userInfo.username}</div>
        <div class="home-elo">⭐ ${userInfo.elo}</div>
      </div>
      <button class="home-logout" id="home-logout">Sign Out</button>
    </div>
    <div class="home-content">
      <div class="home-section-label">Play</div>
      ${GAME_TYPES.map(gt => {
        const m = MODE_META[gt.id];
        return `
          <div class="mode-card" data-gametype="${gt.id}">
            <div class="mode-card-icon ${m.iconClass}">${m.icon}</div>
            <div class="mode-card-info">
              <div class="mode-card-label">${gt.label}</div>
              <div class="mode-card-desc">${m.desc}</div>
            </div>
            <div class="mode-card-arrow">›</div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  screen.querySelector("#home-logout").addEventListener("click", () => {
    if (callbacks.onLogout) callbacks.onLogout();
  });

  screen.querySelectorAll(".mode-card").forEach(card => {
    card.addEventListener("click", () => {
      const gameType = card.dataset.gametype;
      if (callbacks.onSelectMode) callbacks.onSelectMode(gameType);
    });
  });

  return screen;
}

export function createSettingsScreen(config, gameType, userInfo, callbacks) {
  const screen = document.createElement("div");
  screen.className = "settings-screen";

  const isOnline = gameType === "online";
  const isCasualBot = gameType === "casual_bot";
  const isRankedBot = gameType === "ranked_bot";
  const isCoachBot = gameType === "coach_bot";
  const isBotGame = isCasualBot || isRankedBot || isCoachBot;

  let activeCat = "blitz";
  if (config.timeControlId) {
    const tc = TIME_CONTROLS.find(t => t.id === config.timeControlId);
    if (tc) activeCat = tc.category;
  }
  let activeSub = config.timeControlId || "blitz5";
  let activeSide = config.side || "random";
  let activeBotLevel = config.engine.level || "intermediate";

  const byCategory = {};
  CATEGORIES.forEach(c => byCategory[c.id] = []);
  TIME_CONTROLS.forEach(tc => {
    if (byCategory[tc.category]) byCategory[tc.category].push(tc);
  });

  function render() {
    const currentTcs = byCategory[activeCat] || [];
    if (!currentTcs.find(t => t.id === activeSub) && currentTcs.length > 0) {
      activeSub = currentTcs[0].id;
    }

    screen.innerHTML = `
      <div class="settings-header">
        <button class="settings-back" id="settings-back">←</button>
        <div class="settings-title">${isOnline ? "Play vs Player" : isRankedBot ? "Ranked Bot" : isCoachBot ? "Coach" : "Play vs Bot"}</div>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <div class="settings-label">Time Control</div>
          <div class="tc-categories" id="tc-cats"></div>
          <div class="tc-options" id="tc-opts"></div>
        </div>

        ${isCasualBot ? `
          <div class="settings-section">
            <div class="settings-label">Play as</div>
            <div class="option-group" id="side-group"></div>
          </div>
          <div class="settings-section">
            <div class="settings-label">Bot Level</div>
            <div class="option-group" id="bot-group"></div>
          </div>
        ` : ""}

        ${isCoachBot ? `
          <div class="settings-section">
            <div class="settings-label">Bot Level</div>
            <div class="option-group" id="bot-group"></div>
          </div>
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:13px;color:#94a3b8;">Play as <strong style="color:#e2e8f0;">White</strong></div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Engine shows best moves with arrows</div>
          </div>
        ` : ""}

        ${isRankedBot ? `
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:13px;color:#94a3b8;">Bot rated <strong style="color:#e2e8f0;">${Math.max(500, userInfo.elo - 25)}–${userInfo.elo + 25}</strong></div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">Rating changes on result</div>
          </div>
        ` : ""}

        ${isOnline ? `
          <div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:13px;color:#94a3b8;">Side and rating are random</div>
          </div>
        ` : ""}

        <button class="settings-play" id="settings-play">${isOnline ? "Find Match" : "Play"}</button>
      </div>
    `;

    const catsContainer = screen.querySelector("#tc-cats");
    CATEGORIES.forEach(cat => {
      const tcs = byCategory[cat.id] || [];
      if (tcs.length === 0) return;
      const btn = document.createElement("button");
      btn.className = `tc-cat ${cat.id === activeCat ? "active" : ""}`;
      btn.textContent = cat.label;
      btn.addEventListener("click", () => {
        activeCat = cat.id;
        const newTcs = byCategory[cat.id] || [];
        if (newTcs.length > 0 && !newTcs.find(t => t.id === activeSub)) {
          activeSub = newTcs[0].id;
        }
        config.timeControlId = activeSub;
        render();
      });
      catsContainer.appendChild(btn);
    });

    const optsContainer = screen.querySelector("#tc-opts");
    (byCategory[activeCat] || []).forEach(tc => {
      const btn = document.createElement("button");
      btn.className = `tc-btn ${tc.id === activeSub ? "active" : ""}`;
      const min = tc.initial / 60;
      const inc = tc.increment;
      const timeLabel = min >= 1 ? `${min}` : `${tc.initial}`;
      const unitLabel = min >= 1 ? "min" : "sec";
      btn.innerHTML = `<span class="tc-btn-time">${timeLabel}</span><span class="tc-btn-unit">${unitLabel}${inc > 0 ? ` +${inc}s` : ""}</span>`;
      btn.addEventListener("click", () => {
        activeSub = tc.id;
        config.timeControlId = tc.id;
        optsContainer.querySelectorAll(".tc-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
      optsContainer.appendChild(btn);
    });

    if (isCasualBot) {
      const sideGroup = screen.querySelector("#side-group");
      SIDES.forEach(s => {
        const btn = document.createElement("button");
        btn.className = `option-btn ${s.id === activeSide ? "active" : ""}`;
        btn.textContent = s.label;
        btn.addEventListener("click", () => {
          activeSide = s.id;
          config.side = s.id;
          sideGroup.querySelectorAll(".option-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
        sideGroup.appendChild(btn);
      });

      const botGroup = screen.querySelector("#bot-group");
      BOT_LEVELS.forEach(lvl => {
        const btn = document.createElement("button");
        btn.className = `option-btn ${lvl.id === activeBotLevel ? "active" : ""}`;
        btn.textContent = lvl.label;
        btn.addEventListener("click", () => {
          activeBotLevel = lvl.id;
          config.engine.level = lvl.id;
          botGroup.querySelectorAll(".option-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
        botGroup.appendChild(btn);
      });
    }

    if (isCoachBot) {
      const botGroup = screen.querySelector("#bot-group");
      BOT_LEVELS.forEach(lvl => {
        const btn = document.createElement("button");
        btn.className = `option-btn ${lvl.id === activeBotLevel ? "active" : ""}`;
        btn.textContent = lvl.label;
        btn.addEventListener("click", () => {
          activeBotLevel = lvl.id;
          config.engine.level = lvl.id;
          botGroup.querySelectorAll(".option-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        });
        botGroup.appendChild(btn);
      });
    }

    screen.querySelector("#settings-back").addEventListener("click", () => {
      if (callbacks.onBack) callbacks.onBack();
    });

    screen.querySelector("#settings-play").addEventListener("click", () => {
      config.gameType = gameType;
      config.timeControlId = activeSub;
      if (callbacks.onPlay) callbacks.onPlay(config);
    });
  }

  render();
  return screen;
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
    <p class="queue-range" id="queue-range">ELO range: \u00B110</p>
    <p class="queue-time" id="queue-time">0s</p>
    <button class="queue-cancel" id="queue-cancel">Cancel</button>
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
