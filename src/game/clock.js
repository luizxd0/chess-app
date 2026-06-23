const TICK_MS = 100;

export function createClock(initialMs, incrementMs, onFlagFall) {
  return {
    white: initialMs,
    black: initialMs,
    initial: initialMs,
    increment: incrementMs,
    active: null,
    intervalId: null,
    running: false,
    onFlagFall,
  };
}

export function startClock(clock, side) {
  if (!side) return;
  clock.active = side;
  clock.running = true;
  clearInterval(clock.intervalId);
  clock.intervalId = setInterval(() => tick(clock), TICK_MS);
}

function pauseClock(clock) {
  clock.running = false;
  clearInterval(clock.intervalId);
  clock.intervalId = null;
}

export function stopClock(clock) {
  pauseClock(clock);
  clock.active = null;
}

export function switchClock(clock) {
  if (!clock.active) return;
  const prev = clock.active;
  clock[prev] += clock.increment;
  clock.active = prev === "white" ? "black" : "white";
  clock.running = true;
  clearInterval(clock.intervalId);
  clock.intervalId = setInterval(() => tick(clock), TICK_MS);
}

function tick(clock) {
  if (!clock.running || !clock.active) return;
  clock[clock.active] -= TICK_MS;
  if (clock[clock.active] <= 0) {
    clock[clock.active] = 0;
    clock.running = false;
    clearInterval(clock.intervalId);
    clock.intervalId = null;
    if (clock.onFlagFall) clock.onFlagFall(clock.active);
  }
}

export function formatTime(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
