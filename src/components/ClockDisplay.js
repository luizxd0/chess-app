import { formatTime } from "../game/clock.js";

export function createSingleClock(clock, displaySide, playerSide) {
  const box = document.createElement("div");

  const sideLabel = document.createElement("span");
  sideLabel.className = "clock-side";

  const timeEl = document.createElement("span");
  timeEl.className = "clock-time";

  box.appendChild(sideLabel);
  box.appendChild(timeEl);

  function update() {
    const isActive = clock.active === displaySide;
    const isLow = clock[displaySide] <= 60000;
    box.className = `clock-box${isActive ? " clock-active" : ""}${isLow ? " clock-low" : ""}`;
    sideLabel.textContent = displaySide === playerSide ? "You" : (displaySide === "white" ? "White" : "Black");
    timeEl.textContent = formatTime(clock[displaySide]);
  }

  update();
  const timer = setInterval(update, 200);
  box._timer = timer;

  return box;
}
