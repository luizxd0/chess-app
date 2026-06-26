export function createReplay(history, callbacks) {
  let index = Math.max(0, history.length - 1);
  let browsing = false;

  function latestIndex() {
    return Math.max(0, history.length - 1);
  }

  function goTo(nextIndex) {
    const latest = latestIndex();
    index = Math.max(0, Math.min(nextIndex, latest));
    if (index === latest) {
      browsing = false;
      if (callbacks.onExit) callbacks.onExit();
      return;
    }
    browsing = true;
    callbacks.onNavigate(index, history[index]);
  }

  function handleKey(e) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    if (history.length === 0) return;
    e.preventDefault();

    if (!browsing) {
      index = latestIndex();
    }

    if (e.key === "ArrowLeft") {
      goTo(index - 1);
    } else if (e.key === "ArrowRight") {
      goTo(index + 1);
    } else if (e.key === "ArrowUp") {
      goTo(0);
    } else if (e.key === "ArrowDown") {
      goTo(latestIndex());
    }
  }

  document.addEventListener("keydown", handleKey);

  function reset() {
    index = latestIndex();
    browsing = false;
  }

  function destroy() {
    document.removeEventListener("keydown", handleKey);
  }

  return { reset, destroy };
}
