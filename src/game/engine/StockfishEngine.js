export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.available = false;
    this._pendingMove = null;
    this._pendingEval = null;
    this._lastEval = null;
    this._fen = null;
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

  goMultiPV(fen, depth, count) {
    if (!this.available || !this.worker) return Promise.resolve([]);

    return new Promise((resolve) => {
      const lines = [];
      let bestmoveReceived = false;

      const handler = (e) => {
        const line = e.data;
        if (line.startsWith("info") && line.includes("multipv")) {
          const pvMatch = line.match(/multipv (\d+)/);
          const pvIndex = pvMatch ? parseInt(pvMatch[1]) - 1 : 0;
          const pvMoveMatch = line.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
          const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
          if (pvMoveMatch) {
            lines[pvIndex] = {
              move: pvMoveMatch[1],
              score: scoreMatch ? { type: scoreMatch[1], value: parseInt(scoreMatch[2]) } : null,
            };
          }
        }
        if (line.startsWith("bestmove")) {
          this.worker.removeEventListener("message", handler);
          resolve(lines.filter(Boolean).slice(0, count));
        }
      };

      this.worker.addEventListener("message", handler);
      this.worker.postMessage("ucinewgame");
      this.worker.postMessage(`setoption name MultiPV value ${count}`);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);

      setTimeout(() => {
        this.worker.postMessage("stop");
      }, Math.max(500, depth * 200));
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
