export class Engine {
  private worker: Worker;
  private onMessage: ((line: string) => void) | null = null;

  constructor() {
    this.worker = new Worker("/stockfish.js");
    this.worker.onmessage = (e) => {
      if (this.onMessage) this.onMessage(e.data);
    };
    this.worker.postMessage("uci");
  }

  evaluate(fen: string, depth: number): Promise<string> {
    return new Promise((resolve) => {
      this.onMessage = (line) => {
        const match = line.match(/bestmove\s+(\S+)/);
        if (match) {
          resolve(match[1]);
          this.onMessage = null;
        }
      };
      this.worker.postMessage(`position fen ${fen}`);
      // Use depth for higher levels, but limit depth for low levels to make them blunder more
      if (depth <= 3) {
          // Extremely weak: very few nodes
          this.worker.postMessage(`go depth 1 nodes ${Math.floor(Math.random() * 5) + 1}`);
      } else if (depth <= 5) {
          this.worker.postMessage(`go depth 1 nodes 50`);
      } else {
          this.worker.postMessage(`go depth ${Math.floor(depth / 2) + 1}`);
      }
    });
  }

  getTips(fen: string): Promise<{best: string, second: string | null}> {
    return new Promise((resolve) => {
      let best = "";
      let second = "";
      
      this.onMessage = (line) => {
        const pvMatch = line.match(/multipv\s+(\d+).*?pv\s+(\S+)/);
        if (pvMatch) {
          if (pvMatch[1] === "1") best = pvMatch[2];
          if (pvMatch[1] === "2") second = pvMatch[2];
        }
        
        if (line.match(/bestmove/)) {
          resolve({ best, second: second || null });
          this.onMessage = null;
          this.worker.postMessage('setoption name MultiPV value 1'); // reset
        }
      };
      
      this.worker.postMessage('setoption name MultiPV value 2');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth 10`);
    });
  }

  setSkillLevel(level: number) {
    // UCI Skill Level is 0-20. Ensure it's correctly applied.
    this.worker.postMessage(`setoption name Skill Level value ${Math.max(0, level - 1)}`);
  }
}
