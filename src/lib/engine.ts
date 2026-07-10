export class Engine {
  private worker: Worker;
  private onMessage: ((line: string) => void) | null = null;

  constructor() {
    this.worker = new Worker("/stockfish.js");
    this.worker.onmessage = (e) => {
      if (this.onMessage) this.onMessage(e.data);
    };
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
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  setSkillLevel(level: number) {
    this.worker.postMessage(`setoption name Skill Level value ${level}`);
  }
}
