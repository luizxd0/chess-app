export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.available = false;
    this._pendingMove = null;
    this._pendingEval = null;
    this._lastEval = null;
    this._fen = null;
    this._multiPVHandler = null;
    this._multiPVStopTimer = null;
    this._multiPVActive = false;
    // Counts how many stop-generated bestmove responses are still in-flight
    // and should be discarded before processing a real search result.
    this._multiPVPendingStops = 0;
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

        if (this._pendingMove && line.startsWith("bestmove")) {
          const cb = this._pendingMove;
          this._pendingMove = null;
          cb(line);
          return;
        }

        if (this._pendingEval) {
          if (line.indexOf("score cp") !== -1) {
            const m = line.match(/score cp (-?\d+)/);
            if (m) this._lastEval = { type: "cp", value: parseInt(m[1]) };
          } else if (line.indexOf("score mate") !== -1) {
            const m = line.match(/score mate (-?\d+)/);
            if (m) this._lastEval = { type: "mate", value: parseInt(m[1]) };
          }
        }

        if (line.startsWith("bestmove")) {
          this._pendingEval = null;
        }

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

  goTime(maxTime, depth) {
    if (!this.available || !this.worker) {
      const move = this.randomMove();
      return Promise.resolve(move ? `bestmove ${move}` : "bestmove 0000");
    }

    const fen = this._fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    return new Promise((resolve) => {
      this._pendingMove = (line) => resolve(line);

      this.worker.postMessage("ucinewgame");
      this.worker.postMessage(`position fen ${fen}`);
      if (depth && depth > 0) {
        this.worker.postMessage(`go depth ${depth}`);
      } else {
        this.worker.postMessage(`go movetime ${Math.max(100, maxTime || 1000)}`);
      }
    });
  }

  /**
   * Run a multi-PV analysis on the given FEN.
   * @param {string} fen
   * @param {number} depth
   * @param {number} count  Number of top moves to return.
   * @param {function|null} onInfo  Called with current best moves on every PV
   *   update so the UI can draw provisional arrows immediately without waiting
   *   for the full search to finish.
   * @param {number} [maxMs]  Hard time cap in ms (default: 800).  The engine
   *   is stopped after this many ms so the UI never waits more than maxMs for
   *   the final arrows.
   */
  goMultiPV(fen, depth, count, onInfo, maxMs) {
    if (!this.available || !this.worker) return Promise.resolve([]);

    // Cancel any in-flight multiPV search before starting a new one so stale
    // stop timers and orphaned message handlers cannot interfere.
    if (this._multiPVHandler) {
      this.worker.removeEventListener("message", this._multiPVHandler);
      this._multiPVHandler = null;
    }
    if (this._multiPVStopTimer !== null) {
      clearTimeout(this._multiPVStopTimer);
      this._multiPVStopTimer = null;
    }
    if (this._multiPVActive) {
      // Stopping the engine emits a bestmove response that must be skipped.
      // Use a counter (not a boolean) so N rapid calls each increment it and
      // the new handler discards exactly N stale bestmoves before accepting a
      // real result — no matter how many overlapping calls were made.
      this.worker.postMessage("stop");
      this._multiPVPendingStops++;
      this._multiPVActive = false;
    }

    const MIN_SEARCH_MS = 300;
    const DEPTH_MS_FACTOR = 80;
    const MAX_SEARCH_MS = 800;
    const timeLimit = maxMs !== undefined
      ? maxMs
      : Math.min(Math.max(MIN_SEARCH_MS, depth * DEPTH_MS_FACTOR), MAX_SEARCH_MS);

    return new Promise((resolve) => {
      const lines = [];

      const handler = (e) => {
        const line = e.data;
        if (line.startsWith("info") && line.includes("multipv")) {
          // Discard info lines that belong to a search we already cancelled.
          if (this._multiPVPendingStops > 0) return;
          const pvMatch = line.match(/multipv (\d+)/);
          const pvIndex = pvMatch ? parseInt(pvMatch[1]) - 1 : 0;
          const pvMoveMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
          if (pvMoveMatch) {
            lines[pvIndex] = {
              move: pvMoveMatch[1],
              score: scoreMatch ? { type: scoreMatch[1], value: parseInt(scoreMatch[2]) } : null,
            };
            // Fire interim callback so the UI can draw a provisional arrow
            // immediately from the first PV result rather than waiting for
            // bestmove (which may arrive seconds later at high depths).
            if (onInfo) {
              const current = lines.filter(Boolean).slice(0, count);
              if (current.length > 0) onInfo(current);
            }
          }
        }
        if (line.startsWith("bestmove")) {
          if (this._multiPVPendingStops > 0) {
            // Stale bestmove from a previous cancelled search — discard it.
            this._multiPVPendingStops--;
            return;
          }
          this.worker.removeEventListener("message", handler);
          if (this._multiPVHandler === handler) this._multiPVHandler = null;
          if (this._multiPVStopTimer !== null) {
            clearTimeout(this._multiPVStopTimer);
            this._multiPVStopTimer = null;
          }
          this._multiPVActive = false;
          resolve(lines.filter(Boolean).slice(0, count));
        }
      };

      this._multiPVHandler = handler;
      this._multiPVActive = true;
      this.worker.addEventListener("message", handler);

      this.worker.postMessage("ucinewgame");
      this.worker.postMessage(`setoption name MultiPV value ${count}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);

      this._multiPVStopTimer = setTimeout(() => {
        this._multiPVStopTimer = null;
        if (this._multiPVActive) {
          this.worker.postMessage("stop");
        }
      }, timeLimit);
    });
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage("stop");
    }
  }

  getEval(fen) {
    if (!this.available || !this.worker) return null;

    return new Promise((resolve) => {
      this._pendingEval = true;
      this._lastEval = null;

      const check = () => {
        if (this._lastEval) {
          resolve(this._lastEval);
        } else {
          setTimeout(check, 50);
        }
      };
      setTimeout(check, 100);

      this.worker.postMessage("ucinewgame");
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth 10`);
    });
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
