export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.available = false;
    this._fen = null;

    // All searches share one worker, so they must run one-at-a-time. Every
    // search gets a monotonically increasing id; only the newest id is allowed
    // to process worker messages. `_busy` tracks whether a `go` is currently
    // running so a new search can stop it and wait for the engine to go idle
    // before issuing its own commands (this prevents one search's output from
    // leaking into another, which previously corrupted the coach arrows).
    this._seq = 0;
    this._busy = false;
    this._currentHandler = null;
    this._currentAbort = null;
  }

  async init() {
    try {
      const url = "https://cdn.jsdelivr.net/npm/stockfish.js/stockfish.js";
      const response = await fetch(url);
      const code = await response.text();
      const blob = new Blob([code], { type: "application/javascript" });
      const blobUrl = URL.createObjectURL(blob);
      this.worker = new Worker(blobUrl);
      URL.revokeObjectURL(blobUrl);

      this.worker.onmessage = (e) => {
        const line = e.data;
        if (line === "uciok" || line === "readyok") {
          this.available = true;
        }
      };

      this.worker.onerror = () => {
        this.available = false;
      };

      this.worker.postMessage("uci");
      this.worker.postMessage("isready");

      await new Promise((resolve) => {
        const check = () => {
          if (this.available) resolve();
          else setTimeout(check, 50);
        };
        setTimeout(check, 50);
        setTimeout(() => resolve(), 5000);
      });
    } catch (e) {
      console.warn("Stockfish init failed:", e);
      this.available = false;
    }
  }

  setPosition(fen) {
    this._fen = fen;
  }

  // Detach the current result handler and abort its pending promise. Called
  // when a newer search supersedes an in-flight one.
  _detach() {
    if (this._currentHandler) {
      this.worker.removeEventListener("message", this._currentHandler);
      this._currentHandler = null;
    }
    if (this._currentAbort) {
      const abort = this._currentAbort;
      this._currentAbort = null;
      abort();
    }
  }

  // Resolve once the worker is guaranteed idle. If a search is running we stop
  // it and wait for its terminating `bestmove` so its messages can never bleed
  // into the next search. Falls back after a short delay if the engine was
  // already idle and emits nothing.
  _ensureIdle() {
    this._detach();
    if (!this._busy || !this.worker) return Promise.resolve();
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        this.worker.removeEventListener("message", onIdle);
        this._busy = false;
        resolve();
      };
      const onIdle = (e) => {
        if (typeof e.data === "string" && e.data.startsWith("bestmove")) done();
      };
      this.worker.addEventListener("message", onIdle);
      this.worker.postMessage("stop");
      setTimeout(done, 200);
    });
  }

  goTime(maxTime, depth) {
    if (!this.available || !this.worker) {
      const move = this.randomMove();
      return Promise.resolve(move ? `bestmove ${move}` : "bestmove 0000");
    }

    const fen = this._fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const seq = ++this._seq;

    return this._ensureIdle().then(() => new Promise((resolve) => {
      if (seq !== this._seq) { resolve("bestmove 0000"); return; }

      let settled = false;
      const finish = (val) => {
        if (settled) return;
        settled = true;
        this.worker.removeEventListener("message", handler);
        if (this._currentHandler === handler) this._currentHandler = null;
        if (this._currentAbort === abort) this._currentAbort = null;
        if (seq === this._seq) this._busy = false;
        resolve(val);
      };
      const abort = () => finish("bestmove 0000");

      const handler = (e) => {
        if (seq !== this._seq) { this.worker.removeEventListener("message", handler); return; }
        const line = e.data;
        if (typeof line === "string" && line.startsWith("bestmove")) finish(line);
      };

      this._currentHandler = handler;
      this._currentAbort = abort;
      this._busy = true;
      this.worker.addEventListener("message", handler);

      this.worker.postMessage("ucinewgame");
      this.worker.postMessage("setoption name MultiPV value 1");
      this.worker.postMessage(`position fen ${fen}`);
      if (depth && depth > 0) {
        this.worker.postMessage(`go depth ${depth}`);
      } else {
        this.worker.postMessage(`go movetime ${Math.max(100, maxTime || 1000)}`);
      }
    }));
  }

  /**
   * Run a multi-PV analysis on the given FEN.
   * @param {string} fen
   * @param {number} depth
   * @param {number} count  Number of top moves to return.
   * @param {function|null} onInfo  Called with current best moves on every PV
   *   update so the UI can draw provisional arrows immediately without waiting
   *   for the full search to finish.
   * @param {number} [maxMs]  Hard time cap in ms. The engine is stopped after
   *   this many ms so the UI never waits more than maxMs for the final arrows.
   * @returns {Promise<Array|null>} Resolves with the best lines, or `null` when
   *   the search was superseded by a newer one (callers should ignore `null`).
   */
  goMultiPV(fen, depth, count, onInfo, maxMs) {
    if (!this.available || !this.worker) return Promise.resolve([]);

    const seq = ++this._seq;
    const MIN_SEARCH_MS = 300;
    const DEPTH_MS_FACTOR = 80;
    const MAX_SEARCH_MS = 800;
    const timeLimit = maxMs !== undefined
      ? maxMs
      : Math.min(Math.max(MIN_SEARCH_MS, depth * DEPTH_MS_FACTOR), MAX_SEARCH_MS);

    return this._ensureIdle().then(() => new Promise((resolve) => {
      if (seq !== this._seq) { resolve(null); return; }

      const lines = [];
      let settled = false;
      let stopTimer = null;

      const finish = (val) => {
        if (settled) return;
        settled = true;
        this.worker.removeEventListener("message", handler);
        if (this._currentHandler === handler) this._currentHandler = null;
        if (this._currentAbort === abort) this._currentAbort = null;
        if (stopTimer !== null) { clearTimeout(stopTimer); stopTimer = null; }
        if (seq === this._seq) this._busy = false;
        resolve(val);
      };
      // Superseded searches resolve `null` so the caller leaves the existing
      // arrows untouched (rather than clearing them with an empty result).
      const abort = () => finish(null);

      const handler = (e) => {
        if (seq !== this._seq) { this.worker.removeEventListener("message", handler); return; }
        const line = e.data;
        if (typeof line !== "string") return;

        if (line.startsWith("info") && line.includes("multipv")) {
          const pvMatch = line.match(/multipv (\d+)/);
          const pvIndex = pvMatch ? parseInt(pvMatch[1]) - 1 : 0;
          const pvMoveMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
          const depthMatch = line.match(/ depth (\d+)/);
          const depthValue = depthMatch ? parseInt(depthMatch[1]) : null;
          if (pvMoveMatch) {
            lines[pvIndex] = {
              move: pvMoveMatch[1],
              score: scoreMatch ? { type: scoreMatch[1], value: parseInt(scoreMatch[2]) } : null,
              depth: depthValue,
            };
            if (onInfo) {
              const current = lines.filter(Boolean).slice(0, count);
              if (current.length > 0) onInfo(current);
            }
          }
        } else if (line.startsWith("bestmove")) {
          finish(lines.filter(Boolean).slice(0, count));
        }
      };

      this._currentHandler = handler;
      this._currentAbort = abort;
      this._busy = true;
      this.worker.addEventListener("message", handler);

      this.worker.postMessage("ucinewgame");
      this.worker.postMessage(`setoption name MultiPV value ${count}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);

      stopTimer = setTimeout(() => {
        stopTimer = null;
        if (!settled && seq === this._seq) {
          this.worker.postMessage("stop");
          // The stop should trigger a bestmove → finish(). Hard fallback in
          // case the engine emits nothing (already idle).
          setTimeout(() => { finish(lines.filter(Boolean).slice(0, count)); }, 400);
        }
      }, timeLimit);
    }));
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage("stop");
    }
  }

  randomMove() {
    const fen = this._fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const pieces = "pnbrqk";
    const cols = "abcdefgh";
    const allMoves = [];
    for (let i = 0; i < fen.length; i++) {
      if (pieces.includes(fen[i].toLowerCase())) {
        const row = 8 - Math.floor(i / 9);
        const col = i % 9;
        if (col < 8) {
          const from = cols[col] + row;
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = row + dr;
              const nc = col + dc;
              if (nr >= 1 && nr <= 8 && nc >= 0 && nc < 8) {
                allMoves.push(from + cols[nc] + nr);
              }
            }
          }
        }
      }
    }
    if (allMoves.length === 0) return null;
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.available = false;
  }
}
