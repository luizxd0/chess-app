import { Chess } from 'chess.js';

export function getMaterialDifference(chess: Chess) {
  const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let w = 0;
  let b = 0;

  chess.board().forEach(row => {
    row.forEach(piece => {
      if (piece) {
        if (piece.color === 'w') w += pieceValues[piece.type];
        else b += pieceValues[piece.type];
      }
    });
  });

  return { white: w, black: b, advantage: w - b };
}

export function getKingSquare(chess: any, color: 'w' | 'b'): string | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'k' && piece.color === color) {
        return String.fromCharCode(97 + c) + (8 - r);
      }
    }
  }
  return null;
}
