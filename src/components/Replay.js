export function createReplay(history, callbacks) {
  let index = history.length - 1;
  function handleKey(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();

    if (e.key === "ArrowLeft" && index > 0) {
      index--;
      callbacks.onNavigate(index, history[index]);
    } else if (e.key === "ArrowRight" && index < history.length - 1) {
      index++;
      callbacks.onNavigate(index, history[index]);
      if (index === history.length - 1) {
        callbacks.onExit();
      }
    } else if (e.key === "ArrowUp" && index > 0) {
      index = 0;
      callbacks.onNavigate(index, history[index]);
    } else if (e.key === "ArrowDown" && index < history.length - 1) {
      index = history.length - 1;
      callbacks.onNavigate(index, history[index]);
      callbacks.onExit();
    }
  }

  document.addEventListener("keydown", handleKey);

  function reset() {
    index = history.length - 1;
  }

  function destroy() {
    document.removeEventListener("keydown", handleKey);
  }

  return { reset, destroy };
}
