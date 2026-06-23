import { TIME_CONTROLS, SIDES, BOT_LEVELS } from "../config/gameModes.js";

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

export function createMenu(config, playerElo, callbacks) {
  const overlay = document.createElement("div");
  overlay.className = "menu-overlay";

  const panel = document.createElement("div");
  panel.className = "menu-panel";

  const byCategory = {};
  CATEGORIES.forEach((c) => byCategory[c.id] = []);
  TIME_CONTROLS.forEach((tc) => {
    if (byCategory[tc.category]) byCategory[tc.category].push(tc);
  });

  const firstNonEmpty = CATEGORIES.find((c) => byCategory[c.id].length > 0);
  const currentTcs = config.timeControlId
    ? (byCategory[firstNonEmpty.id] || [])
    : [];
  let activeCat = firstNonEmpty ? firstNonEmpty.id : null;
  let activeSub = config.timeControlId || (currentTcs.length > 0 ? currentTcs[0].id : null);

  function render() {
    panel.innerHTML = `
      <h1 class="menu-title">Chess</h1>

      <div class="menu-section">
        <label class="menu-label">Time Control</label>
        <div class="cat-tabs" id="cat-tabs"></div>
        <div class="sub-options" id="sub-options"></div>
      </div>

      <div class="menu-section">
        <label class="menu-label">Play as</label>
        <div class="menu-option-group" id="side-group"></div>
      </div>

      <div class="menu-section">
        <label class="menu-label">Opponent</label>
        <div class="menu-row">
          <button class="menu-btn menu-btn-toggle ${!config.engine.enabled ? "active" : ""}" data-engine="off">👤 Player</button>
          <button class="menu-btn menu-btn-toggle ${config.engine.enabled ? "active" : ""}" data-engine="on">🤖 Engine</button>
        </div>
      </div>

      <div class="menu-section engine-section" id="engine-section" style="${config.engine.enabled ? "" : "display:none"}">
        <label class="menu-label">Bot Level</label>
        <div class="menu-option-group" id="bot-level-group"></div>
      </div>

      <div class="menu-section" style="text-align:center">
        <span style="color:#64748b;font-size:13px">Your ELO: <strong style="color:#e2e8f0">${playerElo}</strong></span>
        <button class="menu-btn menu-btn-small" id="reset-elo" style="color:#f87171;margin-left:8px">Reset</button>
      </div>

      <button class="menu-play-btn" id="play-btn">Play</button>
    `;

    // Category tabs
    const tabs = panel.querySelector("#cat-tabs");
    CATEGORIES.forEach((cat) => {
      const tcs = byCategory[cat.id] || [];
      if (tcs.length === 0) return;
      const tab = document.createElement("button");
      tab.className = `cat-tab ${cat.id === activeCat ? "active" : ""}`;
      tab.innerHTML = `<span class="cat-icon">${cat.icon}</span> ${cat.label}`;
      tab.addEventListener("click", () => {
        activeCat = cat.id;
        if (!tcs.find((t) => t.id === activeSub)) {
          activeSub = tcs[0].id;
        }
        config.timeControlId = activeSub;
        render();
      });
      tabs.appendChild(tab);
    });

    // Sub-options
    const subContainer = panel.querySelector("#sub-options");
    const subTcs = byCategory[activeCat] || [];
    subTcs.forEach((tc) => {
      const btn = document.createElement("button");
      btn.className = `sub-btn ${tc.id === activeSub ? "active" : ""}`;

      const min = tc.initial / 60;
      const inc = tc.increment;
      const timeStr = inc > 0 ? `${formatTime(tc.initial)}|${inc}` : `${formatTime(tc.initial)}`;
      const label = min >= 1 ? `${min}` : `${tc.initial}`;

      btn.innerHTML = `
        <span class="sub-time">${label}</span>
        <span class="sub-unit">${min >= 1 ? "min" : "sec"}${inc > 0 ? ` +${inc}s` : ""}</span>
      `;
      btn.addEventListener("click", () => {
        activeSub = tc.id;
        config.timeControlId = tc.id;
        subContainer.querySelectorAll(".sub-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
      subContainer.appendChild(btn);
    });

    // Sides
    const sideGroup = panel.querySelector("#side-group");
    SIDES.forEach((s) => {
      const btn = document.createElement("button");
      btn.className = `menu-btn menu-btn-side ${s.id === config.side ? "active" : ""}`;
      btn.textContent = s.label;
      btn.addEventListener("click", () => {
        config.side = s.id;
        sideGroup.querySelectorAll(".menu-btn-side").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
      sideGroup.appendChild(btn);
    });

    // Engine toggle
    panel.querySelector("[data-engine='on']").addEventListener("click", () => {
      config.engine.enabled = true;
      panel.querySelector("[data-engine='on']").classList.add("active");
      panel.querySelector("[data-engine='off']").classList.remove("active");
      panel.querySelector("#engine-section").style.display = "";
    });
    panel.querySelector("[data-engine='off']").addEventListener("click", () => {
      config.engine.enabled = false;
      panel.querySelector("[data-engine='off']").classList.add("active");
      panel.querySelector("[data-engine='on']").classList.remove("active");
      panel.querySelector("#engine-section").style.display = "none";
    });

    // Bot levels
    const levelGroup = panel.querySelector("#bot-level-group");
    BOT_LEVELS.forEach((lvl) => {
      const btn = document.createElement("button");
      btn.className = `menu-btn menu-btn-level ${lvl.id === config.engine.level ? "active" : ""}`;
      btn.textContent = lvl.label;
      btn.addEventListener("click", () => {
        config.engine.level = lvl.id;
        levelGroup.querySelectorAll(".menu-btn-level").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
      levelGroup.appendChild(btn);
    });

    // Reset ELO
    panel.querySelector("#reset-elo").addEventListener("click", () => {
      if (callbacks.onResetElo) callbacks.onResetElo();
    });

    // Play
    panel.querySelector("#play-btn").addEventListener("click", () => {
      overlay.remove();
      if (callbacks.onPlay) callbacks.onPlay(config);
    });
  }

  render();
  overlay.appendChild(panel);
  return overlay;
}
